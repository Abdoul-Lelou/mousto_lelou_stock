// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-ignore
Deno.serve(async (req: Request) => {
    // 1. Gestion des requêtes préliminaires CORS (Preflight)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 2. Initialiser le client Admin (Service Role)
        const supabaseAdmin = createClient(
            // @ts-ignore
            Deno.env.get('SUPABASE_URL') ?? '',
            // @ts-ignore
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 3. Vérifier l'utilisateur qui appelle la fonction (sécurité admin)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Token d\'authentification manquant')

        const token = authHeader.replace('Bearer ', '')
        const { data: { user: currentUser }, error: userError } = await supabaseAdmin.auth.getUser(token)

        if (userError || !currentUser) throw new Error('Utilisateur non authentifié')

        // Vérification du rôle admin dans les profils
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single()

        if (!profile || profile.role !== 'admin') {
            return new Response(
                JSON.stringify({ error: 'Accès refusé : Droits administrateur requis' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
        }

        // 4. Récupérer les données de la requête
        const { userId, action } = await req.json()
        if (!userId || !action) throw new Error('Paramètres manquants (userId, action)')

        const isActive = action === 'enable'

        // 5. Mettre à jour l'utilisateur dans auth.users
        // Si action === 'disable', on met une ban_duration. Si 'enable', on l'enlève.
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            {
                ban_duration: isActive ? "none" : "87600h" // 87600h = 10 ans de ban
            }
        )

        if (authUpdateError) throw authUpdateError

        // 6. Mettre à jour le statut dans la table profiles
        const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({ is_active: isActive })
            .eq('id', userId)

        if (profileUpdateError) throw profileUpdateError

        return new Response(
            JSON.stringify({ success: true, message: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
