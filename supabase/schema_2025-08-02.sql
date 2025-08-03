--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.5 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: invite_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invite_status AS ENUM (
    'pending',
    'accepted',
    'revoked'
);


ALTER TYPE public.invite_status OWNER TO postgres;

--
-- Name: team_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.team_role AS ENUM (
    'owner',
    'admin',
    'member'
);


ALTER TYPE public.team_role OWNER TO postgres;

--
-- Name: accept_team_invite(uuid, uuid, text, public.team_role); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.accept_team_invite(p_team_id uuid, p_user_id uuid, p_token text, p_role public.team_role) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Start transaction
  BEGIN
    -- Update invite status
    UPDATE team_invites
    SET status = 'accepted'
    WHERE team_id = p_team_id
    AND token = p_token
    AND status = 'pending';

    -- Add user to team
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (p_team_id, p_user_id, p_role);

    -- Commit transaction
    COMMIT;
  EXCEPTION WHEN OTHERS THEN
    -- Rollback on error
    ROLLBACK;
    RAISE;
  END;
END;
$$;


ALTER FUNCTION public.accept_team_invite(p_team_id uuid, p_user_id uuid, p_token text, p_role public.team_role) OWNER TO postgres;

--
-- Name: calculate_next_monitoring_time(text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_next_monitoring_time(frequency text, last_time timestamp with time zone DEFAULT now()) RETURNS timestamp with time zone
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN CASE frequency
    WHEN 'daily' THEN last_time + INTERVAL '1 day'
    WHEN 'weekly' THEN last_time + INTERVAL '1 week'
    WHEN 'monthly' THEN last_time + INTERVAL '1 month'
    ELSE last_time + INTERVAL '1 day'
  END;
END;
$$;


ALTER FUNCTION public.calculate_next_monitoring_time(frequency text, last_time timestamp with time zone) OWNER TO postgres;

--
-- Name: calculate_team_usage_stats(uuid, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_team_usage_stats(team_id uuid, target_date date DEFAULT CURRENT_DATE) RETURNS TABLE(total_scans integer, total_issues integer, resolved_issues integer, avg_score numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  prev_date DATE := target_date - INTERVAL '1 day';
  prev_issues JSONB;
  curr_issues JSONB;
BEGIN
  -- Get issues from previous day's last scan for each site
  WITH prev_scans AS (
    SELECT DISTINCT ON (site_id) s.id, s.site_id
    FROM scans s
    JOIN sites ON sites.id = s.site_id
    WHERE sites.team_id = team_id
    AND DATE(s.created_at) = prev_date
    ORDER BY site_id, s.created_at DESC
  )
  SELECT jsonb_object_agg(i.rule, i.id)
  INTO prev_issues
  FROM prev_scans ps
  JOIN issues i ON i.scan_id = ps.id;

  -- Get issues from current day's last scan for each site
  WITH curr_scans AS (
    SELECT DISTINCT ON (site_id) s.id, s.site_id
    FROM scans s
    JOIN sites ON sites.id = s.site_id
    WHERE sites.team_id = team_id
    AND DATE(s.created_at) = target_date
    ORDER BY site_id, s.created_at DESC
  )
  SELECT jsonb_object_agg(i.rule, i.id)
  INTO curr_issues
  FROM curr_scans cs
  JOIN issues i ON i.scan_id = cs.id;

  -- Calculate stats
  RETURN QUERY
  SELECT
    COUNT(s.id)::INTEGER as total_scans,
    SUM(COALESCE(s.total_issues, 0))::INTEGER as total_issues,
    (
      CASE
        WHEN prev_issues IS NULL THEN 0
        ELSE (
          SELECT COUNT(*)::INTEGER
          FROM jsonb_object_keys(prev_issues) pk
          WHERE NOT curr_issues ? pk
        )
      END
    ) as resolved_issues,
    ROUND(AVG(s.score)::NUMERIC, 2) as avg_score
  FROM scans s
  JOIN sites ON sites.id = s.site_id
  WHERE sites.team_id = team_id
  AND DATE(s.created_at) = target_date;
END;
$$;


ALTER FUNCTION public.calculate_team_usage_stats(team_id uuid, target_date date) OWNER TO postgres;

--
-- Name: enforce_github_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enforce_github_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.github_id IS NULL THEN
    RAISE EXCEPTION 'github_id cannot be NULL';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.enforce_github_id() OWNER TO postgres;

--
-- Name: get_sites_due_for_monitoring(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_sites_due_for_monitoring(cutoff_time timestamp with time zone DEFAULT now()) RETURNS TABLE(id uuid, url text, team_id uuid, monitoring_frequency text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.url, s.team_id, s.monitoring_frequency
  FROM sites s
  WHERE s.monitoring_enabled = true
  AND s.next_monitoring_at <= cutoff_time
  AND has_team_pro_access(s.team_id);
END;
$$;


ALTER FUNCTION public.get_sites_due_for_monitoring(cutoff_time timestamp with time zone) OWNER TO postgres;

--
-- Name: get_team_usage_stats(uuid, date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_team_usage_stats(team_id uuid, start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), end_date date DEFAULT CURRENT_DATE) RETURNS TABLE(date date, total_scans integer, total_issues integer, resolved_issues integer, avg_score numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Verify user has access to team
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = team_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    us.date,
    us.total_scans,
    us.total_issues,
    us.resolved_issues,
    us.avg_score
  FROM usage_stats us
  WHERE us.team_id = team_id
  AND us.date BETWEEN start_date AND end_date
  ORDER BY us.date ASC;
END;
$$;


ALTER FUNCTION public.get_team_usage_stats(team_id uuid, start_date date, end_date date) OWNER TO postgres;

--
-- Name: handle_new_team(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_team() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_new_team() OWNER TO postgres;

--
-- Name: increment_referral_credits(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_referral_credits() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only increment if under the cap and referral exists
  IF NEW.referred_by IS NOT NULL AND 
     (SELECT referral_credits FROM users WHERE referral_code = NEW.referred_by) < 10 THEN
    UPDATE users 
    SET referral_credits = referral_credits + 1 
    WHERE referral_code = NEW.referred_by;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.increment_referral_credits() OWNER TO postgres;

--
-- Name: is_team_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_team_admin(team_id uuid, user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = $1
    AND team_members.user_id = $2
    AND team_members.role IN ('admin', 'owner')
  );
END;
$_$;


ALTER FUNCTION public.is_team_admin(team_id uuid, user_id uuid) OWNER TO postgres;

--
-- Name: is_team_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_team_member(team_id uuid, user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = $1
    AND team_members.user_id = $2
  );
END;
$_$;


ALTER FUNCTION public.is_team_member(team_id uuid, user_id uuid) OWNER TO postgres;

--
-- Name: trigger_scheduled_monitoring(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_scheduled_monitoring() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    project_url text;
    service_key text;
    response record;
BEGIN
    -- Get project settings (these would be set via environment variables in production)
    project_url := current_setting('app.settings.project_url', true);
    service_key := current_setting('app.settings.service_role_key', true);
    
    -- If settings are not available, log and exit
    IF project_url IS NULL OR service_key IS NULL THEN
        RAISE LOG 'Scheduled monitoring skipped: missing project_url or service_key settings';
        RETURN;
    END IF;
    
    -- Call the edge function
    SELECT INTO response net.http_post(
        url := project_url || '/functions/v1/scheduled-monitoring',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_key
        ),
        body := '{}'::jsonb
    );
    
    -- Log the result
    RAISE LOG 'Scheduled monitoring triggered: status %, response %', 
        response.status_code, 
        response.content;
        
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Scheduled monitoring error: %', SQLERRM;
END;
$$;


ALTER FUNCTION public.trigger_scheduled_monitoring() OWNER TO postgres;

--
-- Name: FUNCTION trigger_scheduled_monitoring(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.trigger_scheduled_monitoring() IS 'Triggers the scheduled monitoring edge function every 6 hours via cron job';


--
-- Name: update_monitoring_schedule(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_monitoring_schedule(site_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE sites
  SET next_monitoring_at = calculate_next_monitoring_time(monitoring_frequency, COALESCE(last_monitored_at, NOW()))
  WHERE id = site_id
  AND monitoring_enabled = true;
END;
$$;


ALTER FUNCTION public.update_monitoring_schedule(site_id uuid) OWNER TO postgres;

--
-- Name: update_monitoring_schedule_trigger(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_monitoring_schedule_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.monitoring_enabled = true THEN
    NEW.next_monitoring_at := calculate_next_monitoring_time(NEW.monitoring_frequency, COALESCE(NEW.last_monitored_at, NOW()));
  ELSE
    NEW.next_monitoring_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_monitoring_schedule_trigger() OWNER TO postgres;

--
-- Name: update_scan_record(uuid, integer, integer, integer, integer, integer, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_scan_record(p_scan_id uuid, p_total_violations integer, p_passes integer, p_incomplete integer, p_inapplicable integer, p_scan_time_ms integer, p_status text, p_finished_at timestamp with time zone) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.scans
  SET 
    total_violations = p_total_violations,
    passes = p_passes,
    incomplete = p_incomplete,
    inapplicable = p_inapplicable,
    scan_time_ms = p_scan_time_ms,
    status = p_status,
    finished_at = p_finished_at,
    updated_at = NOW()
  WHERE id = p_scan_id;
END;
$$;


ALTER FUNCTION public.update_scan_record(p_scan_id uuid, p_total_violations integer, p_passes integer, p_incomplete integer, p_inapplicable integer, p_scan_time_ms integer, p_status text, p_finished_at timestamp with time zone) OWNER TO postgres;

--
-- Name: update_team_usage_stats(uuid, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_team_usage_stats(team_id uuid, target_date date DEFAULT CURRENT_DATE) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Calculate stats
  WITH stats AS (
    SELECT * FROM calculate_team_usage_stats(team_id, target_date)
  )
  INSERT INTO usage_stats (
    team_id,
    date,
    total_scans,
    total_issues,
    resolved_issues,
    avg_score
  )
  SELECT
    team_id,
    target_date,
    total_scans,
    total_issues,
    resolved_issues,
    avg_score
  FROM stats
  ON CONFLICT (team_id, date)
  DO UPDATE SET
    total_scans = EXCLUDED.total_scans,
    total_issues = EXCLUDED.total_issues,
    resolved_issues = EXCLUDED.resolved_issues,
    avg_score = EXCLUDED.avg_score,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION public.update_team_usage_stats(team_id uuid, target_date date) OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: update_user_referral(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_user_referral(p_user_id uuid, p_referral_code uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update user's referred_by
  UPDATE users
  SET referred_by = p_referral_code
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION public.update_user_referral(p_user_id uuid, p_referral_code uuid) OWNER TO postgres;

--
-- Name: update_users_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_users_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_users_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_suggestions_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_suggestions_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    url text NOT NULL,
    violation_count integer NOT NULL,
    suggestions jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.ai_suggestions_log OWNER TO postgres;

--
-- Name: issues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.issues (
    id integer NOT NULL,
    scan_id uuid NOT NULL,
    rule text NOT NULL,
    selector text NOT NULL,
    severity text NOT NULL,
    impact text,
    description text,
    help_url text,
    html text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT issues_impact_check CHECK ((impact = ANY (ARRAY['critical'::text, 'serious'::text, 'moderate'::text, 'minor'::text]))),
    CONSTRAINT issues_severity_check CHECK ((severity = ANY (ARRAY['critical'::text, 'serious'::text, 'moderate'::text, 'minor'::text])))
);


ALTER TABLE public.issues OWNER TO postgres;

--
-- Name: issues_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.issues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issues_id_seq OWNER TO postgres;

--
-- Name: issues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.issues_id_seq OWNED BY public.issues.id;


--
-- Name: monitoring_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.monitoring_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    site_id uuid NOT NULL,
    scan_id uuid,
    success boolean NOT NULL,
    score numeric(5,2),
    violations integer,
    message text NOT NULL,
    error text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT monitoring_logs_score_check CHECK (((score >= (0)::numeric) AND (score <= (100)::numeric)))
);


ALTER TABLE public.monitoring_logs OWNER TO postgres;

--
-- Name: monitoring_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.monitoring_stats AS
SELECT
    NULL::uuid AS site_id,
    NULL::text AS url,
    NULL::text AS site_name,
    NULL::uuid AS user_id,
    NULL::boolean AS monitoring,
    NULL::bigint AS total_monitoring_runs,
    NULL::bigint AS successful_runs,
    NULL::bigint AS failed_runs,
    NULL::numeric AS average_score,
    NULL::bigint AS total_violations,
    NULL::timestamp with time zone AS last_monitored_at;


ALTER VIEW public.monitoring_stats OWNER TO postgres;

--
-- Name: monitoring_summary_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.monitoring_summary_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    sites_monitored integer DEFAULT 0 NOT NULL,
    successful_scans integer DEFAULT 0 NOT NULL,
    failed_scans integer DEFAULT 0 NOT NULL,
    average_score numeric(5,2),
    total_violations integer,
    execution_time_seconds integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT monitoring_summary_logs_average_score_check CHECK (((average_score >= (0)::numeric) AND (average_score <= (100)::numeric)))
);


ALTER TABLE public.monitoring_summary_logs OWNER TO postgres;

--
-- Name: scans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scans (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    site_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    finished_at timestamp with time zone,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    inapplicable integer DEFAULT 0,
    total_violations integer,
    passes integer,
    incomplete integer,
    scan_time_ms integer,
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false NOT NULL,
    user_id uuid NOT NULL,
    CONSTRAINT scans_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text])))
);


ALTER TABLE public.scans OWNER TO postgres;

--
-- Name: COLUMN scans.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.scans.user_id IS 'The user who owns this scan. Used for RLS policies.';


--
-- Name: scan_summaries; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.scan_summaries AS
 SELECT site_id,
    id AS scan_id,
    created_at,
    total_violations,
    passes,
    incomplete,
    inapplicable,
    scan_time_ms
   FROM public.scans s
  WHERE (status = 'completed'::text)
  ORDER BY created_at DESC;


ALTER VIEW public.scan_summaries OWNER TO postgres;

--
-- Name: scan_trends; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scan_trends (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    scan_id uuid NOT NULL,
    site_id uuid NOT NULL,
    previous_scan_id uuid,
    new_issues_count integer DEFAULT 0 NOT NULL,
    resolved_issues_count integer DEFAULT 0 NOT NULL,
    critical_issues_delta integer DEFAULT 0 NOT NULL,
    serious_issues_delta integer DEFAULT 0 NOT NULL,
    moderate_issues_delta integer DEFAULT 0 NOT NULL,
    minor_issues_delta integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.scan_trends OWNER TO postgres;

--
-- Name: scheduled_scan_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scheduled_scan_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    site_id uuid NOT NULL,
    scan_id uuid,
    status text NOT NULL,
    scanned_url text NOT NULL,
    error_message text,
    execution_time_ms integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT scheduled_scan_logs_status_check CHECK ((status = ANY (ARRAY['success'::text, 'failure'::text])))
);


ALTER TABLE public.scheduled_scan_logs OWNER TO postgres;

--
-- Name: TABLE scheduled_scan_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.scheduled_scan_logs IS 'Tracks the execution of scheduled accessibility scans, including success/failure status and error details for debugging.';


--
-- Name: site_trend_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.site_trend_stats AS
 SELECT site_id,
    created_at,
    new_issues_count AS violations_added,
    resolved_issues_count AS violations_resolved,
    (((critical_issues_delta + serious_issues_delta) + moderate_issues_delta) + minor_issues_delta) AS total_violations_delta
   FROM public.scan_trends st
  ORDER BY created_at DESC;


ALTER VIEW public.site_trend_stats OWNER TO postgres;

--
-- Name: sites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sites (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    url text NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    monitoring boolean DEFAULT false,
    custom_domain text,
    monitoring_enabled boolean DEFAULT false,
    github_id text,
    team_id uuid NOT NULL,
    monitoring_frequency text DEFAULT 'daily'::text,
    last_monitored_at timestamp with time zone,
    next_monitoring_at timestamp with time zone,
    CONSTRAINT sites_monitoring_frequency_check CHECK ((monitoring_frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])))
);


ALTER TABLE public.sites OWNER TO postgres;

--
-- Name: COLUMN sites.monitoring_enabled; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sites.monitoring_enabled IS 'Whether automated monitoring is enabled for this site';


--
-- Name: COLUMN sites.github_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sites.github_id IS 'GitHub user ID from OAuth authentication. Used to link sites to GitHub accounts.';


--
-- Name: team_invites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    email text NOT NULL,
    role public.team_role NOT NULL,
    status public.invite_status DEFAULT 'pending'::public.invite_status NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    CONSTRAINT team_invites_email_format CHECK ((email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT team_invites_role_check CHECK ((role <> 'owner'::public.team_role))
);


ALTER TABLE public.team_invites OWNER TO postgres;

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT team_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])))
);


ALTER TABLE public.team_members OWNER TO postgres;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: usage_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usage_stats (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    team_id uuid NOT NULL,
    date date NOT NULL,
    total_scans integer DEFAULT 0,
    total_issues integer DEFAULT 0,
    resolved_issues integer DEFAULT 0,
    avg_score numeric(5,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.usage_stats OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    github_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    avatar_url text,
    name text,
    email text,
    referral_code uuid,
    referred_by uuid,
    referral_credits integer DEFAULT 0,
    pro boolean DEFAULT false,
    stripe_customer_id text,
    stripe_subscription_id text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: issues id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issues ALTER COLUMN id SET DEFAULT nextval('public.issues_id_seq'::regclass);


--
-- Name: ai_suggestions_log ai_suggestions_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_suggestions_log
    ADD CONSTRAINT ai_suggestions_log_pkey PRIMARY KEY (id);


--
-- Name: issues issues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_pkey PRIMARY KEY (id);


--
-- Name: monitoring_logs monitoring_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monitoring_logs
    ADD CONSTRAINT monitoring_logs_pkey PRIMARY KEY (id);


--
-- Name: monitoring_summary_logs monitoring_summary_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monitoring_summary_logs
    ADD CONSTRAINT monitoring_summary_logs_pkey PRIMARY KEY (id);


--
-- Name: scan_trends scan_trends_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scan_trends
    ADD CONSTRAINT scan_trends_pkey PRIMARY KEY (id);


--
-- Name: scans scans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scans
    ADD CONSTRAINT scans_pkey PRIMARY KEY (id);


--
-- Name: scheduled_scan_logs scheduled_scan_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scheduled_scan_logs
    ADD CONSTRAINT scheduled_scan_logs_pkey PRIMARY KEY (id);


--
-- Name: sites sites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_pkey PRIMARY KEY (id);


--
-- Name: team_invites team_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_pkey PRIMARY KEY (id);


--
-- Name: team_invites team_invites_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_token_key UNIQUE (token);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: usage_stats usage_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_stats
    ADD CONSTRAINT usage_stats_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- Name: ai_suggestions_log_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_suggestions_log_user_id_idx ON public.ai_suggestions_log USING btree (user_id);


--
-- Name: idx_issues_rule; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issues_rule ON public.issues USING btree (rule);


--
-- Name: idx_issues_scan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issues_scan_id ON public.issues USING btree (scan_id);


--
-- Name: idx_issues_severity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issues_severity ON public.issues USING btree (severity);


--
-- Name: idx_monitoring_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_monitoring_logs_created_at ON public.monitoring_logs USING btree (created_at);


--
-- Name: idx_monitoring_logs_site_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_monitoring_logs_site_id ON public.monitoring_logs USING btree (site_id);


--
-- Name: idx_monitoring_logs_success; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_monitoring_logs_success ON public.monitoring_logs USING btree (success);


--
-- Name: idx_monitoring_summary_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_monitoring_summary_logs_created_at ON public.monitoring_summary_logs USING btree (created_at);


--
-- Name: idx_scan_trends_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scan_trends_created_at ON public.scan_trends USING btree (created_at);


--
-- Name: idx_scan_trends_scan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scan_trends_scan_id ON public.scan_trends USING btree (scan_id);


--
-- Name: idx_scan_trends_site_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scan_trends_site_id ON public.scan_trends USING btree (site_id);


--
-- Name: idx_scans_site_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scans_site_id ON public.scans USING btree (site_id);


--
-- Name: idx_scans_started_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scans_started_at ON public.scans USING btree (started_at);


--
-- Name: idx_scans_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scans_status ON public.scans USING btree (status);


--
-- Name: idx_scans_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scans_user_id ON public.scans USING btree (user_id);


--
-- Name: idx_scheduled_scan_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scheduled_scan_logs_created_at ON public.scheduled_scan_logs USING btree (created_at);


--
-- Name: idx_scheduled_scan_logs_site_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scheduled_scan_logs_site_id ON public.scheduled_scan_logs USING btree (site_id);


--
-- Name: idx_scheduled_scan_logs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scheduled_scan_logs_status ON public.scheduled_scan_logs USING btree (status);


--
-- Name: idx_sites_github_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sites_github_id ON public.sites USING btree (github_id);


--
-- Name: idx_sites_monitoring; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sites_monitoring ON public.sites USING btree (monitoring);


--
-- Name: idx_sites_team_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sites_team_id ON public.sites USING btree (team_id);


--
-- Name: idx_sites_url; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sites_url ON public.sites USING btree (url);


--
-- Name: idx_sites_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sites_user_id ON public.sites USING btree (user_id);


--
-- Name: idx_team_members_team_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_members_team_id ON public.team_members USING btree (team_id);


--
-- Name: idx_team_members_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_members_user_id ON public.team_members USING btree (user_id);


--
-- Name: idx_usage_stats_team_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_usage_stats_team_date ON public.usage_stats USING btree (team_id, date);


--
-- Name: idx_users_stripe_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_stripe_customer_id ON public.users USING btree (stripe_customer_id);


--
-- Name: idx_users_stripe_subscription_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_stripe_subscription_id ON public.users USING btree (stripe_subscription_id);


--
-- Name: team_invites_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX team_invites_email_idx ON public.team_invites USING btree (email);


--
-- Name: team_invites_team_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX team_invites_team_id_idx ON public.team_invites USING btree (team_id);


--
-- Name: team_invites_token_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX team_invites_token_idx ON public.team_invites USING btree (token);


--
-- Name: team_members_team_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX team_members_team_id_idx ON public.team_members USING btree (team_id);


--
-- Name: team_members_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX team_members_user_id_idx ON public.team_members USING btree (user_id);


--
-- Name: users_github_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_github_id_unique ON public.users USING btree (github_id);


--
-- Name: users_referral_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_referral_code_idx ON public.users USING btree (referral_code);


--
-- Name: monitoring_stats _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW public.monitoring_stats WITH (security_invoker='true') AS
 SELECT s.id AS site_id,
    s.url,
    s.name AS site_name,
    s.user_id,
    s.monitoring,
    count(ml.id) AS total_monitoring_runs,
    count(
        CASE
            WHEN (ml.success = true) THEN 1
            ELSE NULL::integer
        END) AS successful_runs,
    count(
        CASE
            WHEN (ml.success = false) THEN 1
            ELSE NULL::integer
        END) AS failed_runs,
    avg(
        CASE
            WHEN (ml.success = true) THEN ml.score
            ELSE NULL::numeric
        END) AS average_score,
    sum(
        CASE
            WHEN (ml.success = true) THEN ml.violations
            ELSE NULL::integer
        END) AS total_violations,
    max(ml.created_at) AS last_monitored_at
   FROM (public.sites s
     LEFT JOIN public.monitoring_logs ml ON ((s.id = ml.site_id)))
  WHERE (s.monitoring = true)
  GROUP BY s.id;


--
-- Name: users enforce_github_id_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER enforce_github_id_trigger BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.enforce_github_id();


--
-- Name: teams on_team_created; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_team_created AFTER INSERT ON public.teams FOR EACH ROW EXECUTE FUNCTION public.handle_new_team();


--
-- Name: users on_user_referred; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_user_referred AFTER UPDATE OF referred_by ON public.users FOR EACH ROW EXECUTE FUNCTION public.increment_referral_credits();


--
-- Name: sites update_site_monitoring_schedule; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_site_monitoring_schedule BEFORE INSERT OR UPDATE OF monitoring_enabled, monitoring_frequency, last_monitored_at ON public.sites FOR EACH ROW EXECUTE FUNCTION public.update_monitoring_schedule_trigger();


--
-- Name: sites update_sites_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_trigger BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_users_updated_at();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_users_updated_at();


--
-- Name: ai_suggestions_log ai_suggestions_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_suggestions_log
    ADD CONSTRAINT ai_suggestions_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: issues issues_scan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_scan_id_fkey FOREIGN KEY (scan_id) REFERENCES public.scans(id) ON DELETE CASCADE;


--
-- Name: monitoring_logs monitoring_logs_scan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monitoring_logs
    ADD CONSTRAINT monitoring_logs_scan_id_fkey FOREIGN KEY (scan_id) REFERENCES public.scans(id) ON DELETE SET NULL;


--
-- Name: monitoring_logs monitoring_logs_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monitoring_logs
    ADD CONSTRAINT monitoring_logs_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;


--
-- Name: scan_trends scan_trends_previous_scan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scan_trends
    ADD CONSTRAINT scan_trends_previous_scan_id_fkey FOREIGN KEY (previous_scan_id) REFERENCES public.scans(id) ON DELETE SET NULL;


--
-- Name: scan_trends scan_trends_scan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scan_trends
    ADD CONSTRAINT scan_trends_scan_id_fkey FOREIGN KEY (scan_id) REFERENCES public.scans(id) ON DELETE CASCADE;


--
-- Name: scan_trends scan_trends_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scan_trends
    ADD CONSTRAINT scan_trends_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;


--
-- Name: scans scans_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scans
    ADD CONSTRAINT scans_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;


--
-- Name: scans scans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scans
    ADD CONSTRAINT scans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: scheduled_scan_logs scheduled_scan_logs_scan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scheduled_scan_logs
    ADD CONSTRAINT scheduled_scan_logs_scan_id_fkey FOREIGN KEY (scan_id) REFERENCES public.scans(id) ON DELETE SET NULL;


--
-- Name: scheduled_scan_logs scheduled_scan_logs_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scheduled_scan_logs
    ADD CONSTRAINT scheduled_scan_logs_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;


--
-- Name: sites sites_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: sites sites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_invites team_invites_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: teams teams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: usage_stats usage_stats_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_stats
    ADD CONSTRAINT usage_stats_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: users users_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(referral_code) ON DELETE SET NULL;


--
-- Name: sites Allow users to delete their own sites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow users to delete their own sites" ON public.sites FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: scan_trends Allow users to read their own scan trends; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow users to read their own scan trends" ON public.scan_trends FOR SELECT USING ((site_id IN ( SELECT sites.id
   FROM public.sites
  WHERE (sites.user_id = auth.uid()))));


--
-- Name: scans Anyone can read public scans; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read public scans" ON public.scans FOR SELECT USING ((public = true));


--
-- Name: monitoring_summary_logs Authenticated users can view monitoring summary logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view monitoring summary logs" ON public.monitoring_summary_logs FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: scheduled_scan_logs Service can insert scheduled scan logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service can insert scheduled scan logs" ON public.scheduled_scan_logs FOR INSERT WITH CHECK (true);


--
-- Name: users Service role can do everything; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can do everything" ON public.users USING (true) WITH CHECK (true);


--
-- Name: monitoring_logs Service role can insert monitoring logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can insert monitoring logs" ON public.monitoring_logs FOR INSERT WITH CHECK (true);


--
-- Name: monitoring_summary_logs Service role can insert monitoring summary logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can insert monitoring summary logs" ON public.monitoring_summary_logs FOR INSERT WITH CHECK (true);


--
-- Name: scan_trends Service role can insert scan trends; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can insert scan trends" ON public.scan_trends FOR INSERT WITH CHECK (true);


--
-- Name: scans Team admins can update scans; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team admins can update scans" ON public.scans FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.sites s
     JOIN public.team_members tm ON ((tm.team_id = s.team_id)))
  WHERE ((s.id = scans.site_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::text, 'admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.sites s
     JOIN public.team_members tm ON ((tm.team_id = s.team_id)))
  WHERE ((s.id = scans.site_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


--
-- Name: scans Team members can create scans; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can create scans" ON public.scans FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.sites s
     JOIN public.team_members tm ON ((tm.team_id = s.team_id)))
  WHERE ((s.id = scans.site_id) AND (tm.user_id = auth.uid())))));


--
-- Name: sites Team members can delete team sites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can delete team sites" ON public.sites FOR DELETE USING ((team_id IN ( SELECT team_members.team_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


--
-- Name: sites Team members can insert sites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can insert sites" ON public.sites FOR INSERT WITH CHECK ((team_id IN ( SELECT team_members.team_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid()))));


--
-- Name: sites Team members can update team sites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can update team sites" ON public.sites FOR UPDATE USING ((team_id IN ( SELECT team_members.team_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text])))))) WITH CHECK ((team_id IN ( SELECT team_members.team_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


--
-- Name: team_invites Team members can view invites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can view invites" ON public.team_invites FOR SELECT USING (public.is_team_member(team_id, auth.uid()));


--
-- Name: team_members Team members can view other team members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can view other team members" ON public.team_members FOR SELECT USING (public.is_team_member(team_id, auth.uid()));


--
-- Name: scans Team members can view scans; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can view scans" ON public.scans FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.sites s
     JOIN public.team_members tm ON ((tm.team_id = s.team_id)))
  WHERE ((s.id = scans.site_id) AND (tm.user_id = auth.uid())))));


--
-- Name: sites Team members can view team sites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can view team sites" ON public.sites FOR SELECT USING ((team_id IN ( SELECT team_members.team_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid()))));


--
-- Name: teams Team members can view their teams; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can view their teams" ON public.teams FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = teams.id) AND (team_members.user_id = auth.uid())))));


--
-- Name: teams Team owners can delete teams; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team owners can delete teams" ON public.teams FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = teams.id) AND (team_members.user_id = auth.uid()) AND (team_members.role = 'owner'::text)))));


--
-- Name: team_members Team owners can remove members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team owners can remove members" ON public.team_members FOR DELETE USING ((public.is_team_admin(team_id, auth.uid()) AND (NOT (EXISTS ( SELECT 1
   FROM public.team_members team_members_1
  WHERE ((team_members_1.id = team_members_1.id) AND (team_members_1.role = 'owner'::text)))))));


--
-- Name: team_members Team owners/admins can add members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team owners/admins can add members" ON public.team_members FOR INSERT WITH CHECK (public.is_team_admin(team_id, auth.uid()));


--
-- Name: team_invites Team owners/admins can create invites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team owners/admins can create invites" ON public.team_invites FOR INSERT WITH CHECK (public.is_team_admin(team_id, auth.uid()));


--
-- Name: team_invites Team owners/admins can update invite status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team owners/admins can update invite status" ON public.team_invites FOR UPDATE USING (public.is_team_admin(team_id, auth.uid()));


--
-- Name: team_members Team owners/admins can update member roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team owners/admins can update member roles" ON public.team_members FOR UPDATE USING (public.is_team_admin(team_id, auth.uid())) WITH CHECK ((NOT (EXISTS ( SELECT 1
   FROM public.team_members team_members_1
  WHERE ((team_members_1.id = team_members_1.id) AND (team_members_1.role = 'owner'::text))))));


--
-- Name: teams Team owners/admins can update team details; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team owners/admins can update team details" ON public.teams FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = teams.id) AND (team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


--
-- Name: teams Users can create teams; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create teams" ON public.teams FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- Name: issues Users can delete issues for their own scans; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete issues for their own scans" ON public.issues FOR DELETE USING ((scan_id IN ( SELECT s.id
   FROM (public.scans s
     JOIN public.sites st ON ((s.site_id = st.id)))
  WHERE (st.user_id = auth.uid()))));


--
-- Name: scans Users can delete their own scans; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own scans" ON public.scans FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: issues Users can insert issues for their own scans; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert issues for their own scans" ON public.issues FOR INSERT WITH CHECK ((scan_id IN ( SELECT s.id
   FROM (public.scans s
     JOIN public.sites st ON ((s.site_id = st.id)))
  WHERE (st.user_id = auth.uid()))));


--
-- Name: ai_suggestions_log Users can insert their own logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own logs" ON public.ai_suggestions_log FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: scans Users can insert their own scans; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own scans" ON public.scans FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: sites Users can insert their own sites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own sites" ON public.sites FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: users Users can manage their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own profile" ON public.users USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: ai_suggestions_log Users can read their own logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their own logs" ON public.ai_suggestions_log FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: users Users can read their own referral data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their own referral data" ON public.users FOR SELECT USING (((auth.uid() = id) OR (EXISTS ( SELECT 1
   FROM public.users u2
  WHERE ((u2.id = auth.uid()) AND (u2.referred_by = users.referral_code))))));


--
-- Name: issues Users can update issues for their own scans; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update issues for their own scans" ON public.issues FOR UPDATE USING ((scan_id IN ( SELECT s.id
   FROM (public.scans s
     JOIN public.sites st ON ((s.site_id = st.id)))
  WHERE (st.user_id = auth.uid()))));


--
-- Name: users Users can update their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING ((auth.uid() = id));


--
-- Name: users Users can update their own profile with referral info; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own profile with referral info" ON public.users FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: users Users can update their own referral data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own referral data" ON public.users FOR UPDATE USING ((auth.uid() = id));


--
-- Name: scans Users can update their own scans; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own scans" ON public.scans FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: issues Users can view issues for their own scans; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view issues for their own scans" ON public.issues FOR SELECT USING ((scan_id IN ( SELECT s.id
   FROM (public.scans s
     JOIN public.sites st ON ((s.site_id = st.id)))
  WHERE (st.user_id = auth.uid()))));


--
-- Name: monitoring_logs Users can view monitoring logs for their own sites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view monitoring logs for their own sites" ON public.monitoring_logs FOR SELECT USING ((site_id IN ( SELECT sites.id
   FROM public.sites
  WHERE (sites.user_id = auth.uid()))));


--
-- Name: scan_trends Users can view scan trends for their own sites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view scan trends for their own sites" ON public.scan_trends FOR SELECT USING ((site_id IN ( SELECT sites.id
   FROM public.sites
  WHERE (sites.user_id = auth.uid()))));


--
-- Name: scheduled_scan_logs Users can view scheduled scan logs for their own sites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view scheduled scan logs for their own sites" ON public.scheduled_scan_logs FOR SELECT USING ((site_id IN ( SELECT sites.id
   FROM public.sites
  WHERE (sites.user_id = auth.uid()))));


--
-- Name: scans Users can view their own scans; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own scans" ON public.scans FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: usage_stats Users can view their team's usage stats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their team's usage stats" ON public.usage_stats FOR SELECT USING ((team_id IN ( SELECT team_members.team_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid()))));


--
-- Name: ai_suggestions_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_suggestions_log ENABLE ROW LEVEL SECURITY;

--
-- Name: issues; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

--
-- Name: monitoring_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.monitoring_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: monitoring_summary_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.monitoring_summary_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: scan_trends; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.scan_trends ENABLE ROW LEVEL SECURITY;

--
-- Name: scans; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_scan_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.scheduled_scan_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: sites; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

--
-- Name: team_invites; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: usage_stats; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION accept_team_invite(p_team_id uuid, p_user_id uuid, p_token text, p_role public.team_role); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.accept_team_invite(p_team_id uuid, p_user_id uuid, p_token text, p_role public.team_role) TO anon;
GRANT ALL ON FUNCTION public.accept_team_invite(p_team_id uuid, p_user_id uuid, p_token text, p_role public.team_role) TO authenticated;
GRANT ALL ON FUNCTION public.accept_team_invite(p_team_id uuid, p_user_id uuid, p_token text, p_role public.team_role) TO service_role;


--
-- Name: FUNCTION calculate_next_monitoring_time(frequency text, last_time timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.calculate_next_monitoring_time(frequency text, last_time timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.calculate_next_monitoring_time(frequency text, last_time timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.calculate_next_monitoring_time(frequency text, last_time timestamp with time zone) TO service_role;


--
-- Name: FUNCTION calculate_team_usage_stats(team_id uuid, target_date date); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.calculate_team_usage_stats(team_id uuid, target_date date) TO anon;
GRANT ALL ON FUNCTION public.calculate_team_usage_stats(team_id uuid, target_date date) TO authenticated;
GRANT ALL ON FUNCTION public.calculate_team_usage_stats(team_id uuid, target_date date) TO service_role;


--
-- Name: FUNCTION enforce_github_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.enforce_github_id() TO anon;
GRANT ALL ON FUNCTION public.enforce_github_id() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_github_id() TO service_role;


--
-- Name: FUNCTION get_sites_due_for_monitoring(cutoff_time timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_sites_due_for_monitoring(cutoff_time timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.get_sites_due_for_monitoring(cutoff_time timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.get_sites_due_for_monitoring(cutoff_time timestamp with time zone) TO service_role;


--
-- Name: FUNCTION get_team_usage_stats(team_id uuid, start_date date, end_date date); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_team_usage_stats(team_id uuid, start_date date, end_date date) TO anon;
GRANT ALL ON FUNCTION public.get_team_usage_stats(team_id uuid, start_date date, end_date date) TO authenticated;
GRANT ALL ON FUNCTION public.get_team_usage_stats(team_id uuid, start_date date, end_date date) TO service_role;


--
-- Name: FUNCTION handle_new_team(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_team() TO anon;
GRANT ALL ON FUNCTION public.handle_new_team() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_team() TO service_role;


--
-- Name: FUNCTION increment_referral_credits(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.increment_referral_credits() TO anon;
GRANT ALL ON FUNCTION public.increment_referral_credits() TO authenticated;
GRANT ALL ON FUNCTION public.increment_referral_credits() TO service_role;


--
-- Name: FUNCTION is_team_admin(team_id uuid, user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_team_admin(team_id uuid, user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_team_admin(team_id uuid, user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_team_admin(team_id uuid, user_id uuid) TO service_role;


--
-- Name: FUNCTION is_team_member(team_id uuid, user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_team_member(team_id uuid, user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_team_member(team_id uuid, user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_team_member(team_id uuid, user_id uuid) TO service_role;


--
-- Name: FUNCTION trigger_scheduled_monitoring(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_scheduled_monitoring() TO anon;
GRANT ALL ON FUNCTION public.trigger_scheduled_monitoring() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_scheduled_monitoring() TO service_role;


--
-- Name: FUNCTION update_monitoring_schedule(site_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_monitoring_schedule(site_id uuid) TO anon;
GRANT ALL ON FUNCTION public.update_monitoring_schedule(site_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.update_monitoring_schedule(site_id uuid) TO service_role;


--
-- Name: FUNCTION update_monitoring_schedule_trigger(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_monitoring_schedule_trigger() TO anon;
GRANT ALL ON FUNCTION public.update_monitoring_schedule_trigger() TO authenticated;
GRANT ALL ON FUNCTION public.update_monitoring_schedule_trigger() TO service_role;


--
-- Name: FUNCTION update_scan_record(p_scan_id uuid, p_total_violations integer, p_passes integer, p_incomplete integer, p_inapplicable integer, p_scan_time_ms integer, p_status text, p_finished_at timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_scan_record(p_scan_id uuid, p_total_violations integer, p_passes integer, p_incomplete integer, p_inapplicable integer, p_scan_time_ms integer, p_status text, p_finished_at timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.update_scan_record(p_scan_id uuid, p_total_violations integer, p_passes integer, p_incomplete integer, p_inapplicable integer, p_scan_time_ms integer, p_status text, p_finished_at timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.update_scan_record(p_scan_id uuid, p_total_violations integer, p_passes integer, p_incomplete integer, p_inapplicable integer, p_scan_time_ms integer, p_status text, p_finished_at timestamp with time zone) TO service_role;


--
-- Name: FUNCTION update_team_usage_stats(team_id uuid, target_date date); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_team_usage_stats(team_id uuid, target_date date) TO anon;
GRANT ALL ON FUNCTION public.update_team_usage_stats(team_id uuid, target_date date) TO authenticated;
GRANT ALL ON FUNCTION public.update_team_usage_stats(team_id uuid, target_date date) TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION update_user_referral(p_user_id uuid, p_referral_code uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_user_referral(p_user_id uuid, p_referral_code uuid) TO anon;
GRANT ALL ON FUNCTION public.update_user_referral(p_user_id uuid, p_referral_code uuid) TO authenticated;
GRANT ALL ON FUNCTION public.update_user_referral(p_user_id uuid, p_referral_code uuid) TO service_role;


--
-- Name: FUNCTION update_users_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_users_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_users_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_users_updated_at() TO service_role;


--
-- Name: TABLE ai_suggestions_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_suggestions_log TO anon;
GRANT ALL ON TABLE public.ai_suggestions_log TO authenticated;
GRANT ALL ON TABLE public.ai_suggestions_log TO service_role;


--
-- Name: TABLE issues; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.issues TO anon;
GRANT ALL ON TABLE public.issues TO authenticated;
GRANT ALL ON TABLE public.issues TO service_role;


--
-- Name: SEQUENCE issues_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.issues_id_seq TO anon;
GRANT ALL ON SEQUENCE public.issues_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.issues_id_seq TO service_role;


--
-- Name: TABLE monitoring_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.monitoring_logs TO anon;
GRANT ALL ON TABLE public.monitoring_logs TO authenticated;
GRANT ALL ON TABLE public.monitoring_logs TO service_role;


--
-- Name: TABLE monitoring_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.monitoring_stats TO anon;
GRANT ALL ON TABLE public.monitoring_stats TO authenticated;
GRANT ALL ON TABLE public.monitoring_stats TO service_role;


--
-- Name: TABLE monitoring_summary_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.monitoring_summary_logs TO anon;
GRANT ALL ON TABLE public.monitoring_summary_logs TO authenticated;
GRANT ALL ON TABLE public.monitoring_summary_logs TO service_role;


--
-- Name: TABLE scans; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.scans TO anon;
GRANT ALL ON TABLE public.scans TO authenticated;
GRANT ALL ON TABLE public.scans TO service_role;


--
-- Name: TABLE scan_summaries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.scan_summaries TO anon;
GRANT ALL ON TABLE public.scan_summaries TO authenticated;
GRANT ALL ON TABLE public.scan_summaries TO service_role;


--
-- Name: TABLE scan_trends; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.scan_trends TO anon;
GRANT ALL ON TABLE public.scan_trends TO authenticated;
GRANT ALL ON TABLE public.scan_trends TO service_role;


--
-- Name: TABLE scheduled_scan_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.scheduled_scan_logs TO anon;
GRANT ALL ON TABLE public.scheduled_scan_logs TO authenticated;
GRANT ALL ON TABLE public.scheduled_scan_logs TO service_role;


--
-- Name: TABLE site_trend_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.site_trend_stats TO anon;
GRANT ALL ON TABLE public.site_trend_stats TO authenticated;
GRANT ALL ON TABLE public.site_trend_stats TO service_role;


--
-- Name: TABLE sites; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sites TO anon;
GRANT ALL ON TABLE public.sites TO authenticated;
GRANT ALL ON TABLE public.sites TO service_role;


--
-- Name: TABLE team_invites; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.team_invites TO anon;
GRANT ALL ON TABLE public.team_invites TO authenticated;
GRANT ALL ON TABLE public.team_invites TO service_role;


--
-- Name: TABLE team_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.team_members TO anon;
GRANT ALL ON TABLE public.team_members TO authenticated;
GRANT ALL ON TABLE public.team_members TO service_role;


--
-- Name: TABLE teams; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.teams TO anon;
GRANT ALL ON TABLE public.teams TO authenticated;
GRANT ALL ON TABLE public.teams TO service_role;


--
-- Name: TABLE usage_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.usage_stats TO anon;
GRANT ALL ON TABLE public.usage_stats TO authenticated;
GRANT ALL ON TABLE public.usage_stats TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

