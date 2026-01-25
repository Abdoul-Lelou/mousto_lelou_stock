// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-ignore
Deno.serve(async (req: Request) => {
    // Gestion des requêtes préliminaires CORS (Preflight)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Initialiser le client Admin (Service Role)
        const supabaseAdmin = createClient(
            // @ts-ignore
            Deno.env.get('SUPABASE_URL') ?? '',
            // @ts-ignore
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Vérifier l'utilisateur qui appelle la fonction
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Token d\'authentification manquant')
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

        if (userError || !user) {
            throw new Error('Utilisateur non authentifié')
        }

        // 3. Vérifier le rôle de l'utilisateur dans la table 'profiles'
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'admin') {
            return new Response(
                JSON.stringify({ error: 'Accès refusé : Droits administrateur requis' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
        }

        // 4. Si tout est OK, on procède à la création du nouvel utilisateur
        const { email, password, role, firstname, lastname } = await req.json()

        // Création Auth
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { firstname, lastname, full_name: `${firstname} ${lastname}` }
        })

        if (createError) throw createError

        // Création Profil
        if (newUser.user) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert([
                    { id: newUser.user.id, role, firstname, lastname }
                ])

            if (profileError) throw profileError
        }

        return new Response(
            JSON.stringify(newUser),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
