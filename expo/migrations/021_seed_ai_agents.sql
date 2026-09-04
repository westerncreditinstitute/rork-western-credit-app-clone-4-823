-- ============================================================
-- Seeder: Populate 10,000 AI credit repair agents
-- ============================================================
-- Run AFTER migration 011.  Generates 10,000 agent rows with
-- rotating names, specialties, avatars, and bios.
-- ============================================================

DO $$
DECLARE
    first_names TEXT[] := ARRAY[
        'Alex','Jordan','Taylor','Morgan','Riley','Casey','Jamie','Avery',
        'Quinn','Sam','Drew','Reese','Cameron','Skylar','Harper','Phoenix',
        'River','Sage','Robin','Devon','Ellis','Hayden','Kendall','Logan',
        'Marlowe','Nico','Parker','Remy','Tatum','Wren','Blake','Carter',
        'Dakota','Emerson','Finley','Greer','Indigo','Jules','Kai','Lane'
    ];
    last_names TEXT[] := ARRAY[
        'Hart','Banks','Cole','Reed','Stone','Wells','Lane','Vaughn',
        'Mercer','Quinn','Bishop','Clarke','Frost','Grant','Hayes','Irwin',
        'Knox','Locke','Monroe','Pace','Rhodes','Sloan','Thorne','Vance',
        'Wade','Young','Zane','Bell','Cross','Dane','East','Faye',
        'Gale','Hale','Ives','Jett','Kerr','Lowe','Maddox','Nash'
    ];
    specialties TEXT[] := ARRAY[
        'credit_repair','debt_validation','dispute_letters','credit_building',
        'utilization_optimization','identity_protection','fico_strategy',
        'authorized_user_strategy','collection_removal','credit_mix'
    ];
    bio_templates TEXT[] := ARRAY[
        'I specialize in FCRA Section 609 disputes and documentation requests. Let me help you remove inaccurate items from your report.',
        'FDCPA debt validation expert. I will help you challenge collection accounts and force collectors to prove their claims.',
        'I focus on credit utilization optimization. Getting your cards below 30% can boost your score by 30+ points fast.',
        'Authorized user strategy specialist. I can help you leverage family accounts to jumpstart your credit profile.',
        'Dispute letter generation is my core skill. 609, 611, 623 — I know which letter to send and when.',
        'Credit building from scratch. Secured cards, credit builder loans, and smart account aging strategies.',
        'Identity protection and credit freeze expert. Let me secure your profile against fraud.',
        'Collection removal specialist. I know how to negotiate pay-for-delete and validate old debts.',
        'Credit mix optimization. I will help you build a diverse profile that maximizes your FICO score.',
        'FICO scoring strategist. I understand the 35/30/15/10/10 breakdown and how to optimize every factor.'
    ];
    i INTEGER;
    agent_count INTEGER;
    fname TEXT;
    lname TEXT;
    specialty TEXT;
    bio TEXT;
    avatar TEXT;
BEGIN
    SELECT COUNT(*) INTO agent_count FROM public.ai_agent_pool;

    -- Only seed if the table is empty
    IF agent_count = 0 THEN
        FOR i IN 1..10000 LOOP
            fname := first_names[1 + (i % array_length(first_names,1))];
            lname := last_names[1 + ((i * 7) % array_length(last_names,1))];
            specialty := specialties[1 + (i % array_length(specialties,1))];
            bio := bio_templates[1 + (i % array_length(bio_templates,1))];

            -- Deterministic avatar from DiceBear (no external API key needed)
            avatar := 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || fname || lname || i::TEXT;

            INSERT INTO public.ai_agent_pool (agent_name, avatar_url, bio, specialty, max_users, current_user_count, is_active)
            VALUES (fname || ' ' || lname || ' #' || i::TEXT, avatar, bio, specialty, 25, 0, TRUE);
        END LOOP;
        RAISE NOTICE 'Seeded 10,000 AI agents successfully.';
    ELSE
        RAISE NOTICE 'ai_agent_pool already has % rows — skipping seed.', agent_count;
    END IF;
END $$;
