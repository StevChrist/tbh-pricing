--
-- PostgreSQL database dump
--

\restrict hpTGawjfvxPwLO8Hrx4ir9monvuAcbRjP2zjJdVRZ6TAmR9Ko8tDx7hAljujUIe

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: alert_currency_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.alert_currency_enum AS ENUM (
    'IDR',
    'USD'
);


ALTER TYPE public.alert_currency_enum OWNER TO postgres;

--
-- Name: alert_direction_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.alert_direction_enum AS ENUM (
    'UP',
    'DOWN'
);


ALTER TYPE public.alert_direction_enum OWNER TO postgres;

--
-- Name: alert_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.alert_type_enum AS ENUM (
    'PRICE_BELOW',
    'PRICE_ABOVE',
    'PERCENT_CHANGE'
);


ALTER TYPE public.alert_type_enum OWNER TO postgres;

--
-- Name: fetch_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.fetch_status_enum AS ENUM (
    'OK',
    'UNAVAILABLE',
    'ERROR'
);


ALTER TYPE public.fetch_status_enum OWNER TO postgres;

--
-- Name: rarity_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.rarity_enum AS ENUM (
    'COMMON',
    'UNCOMMON',
    'RARE',
    'EPIC',
    'LEGENDARY',
    'UNIQUE',
    'ARCANA',
    'IMMORTAL',
    'BEYOND'
);


ALTER TYPE public.rarity_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_settings (
    key character varying(128) NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.app_settings OWNER TO postgres;

--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_items (
    id integer NOT NULL,
    user_id integer NOT NULL,
    master_item_id integer NOT NULL,
    quantity integer NOT NULL,
    notes text,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_items OWNER TO postgres;

--
-- Name: inventory_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.inventory_items_id_seq OWNER TO postgres;

--
-- Name: inventory_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_items_id_seq OWNED BY public.inventory_items.id;


--
-- Name: master_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.master_items (
    id integer NOT NULL,
    market_hash_name character varying(512) NOT NULL,
    display_name character varying(512) NOT NULL,
    item_type character varying(128),
    rarity public.rarity_enum,
    gear_type character varying(64),
    icon_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.master_items OWNER TO postgres;

--
-- Name: master_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.master_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.master_items_id_seq OWNER TO postgres;

--
-- Name: master_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.master_items_id_seq OWNED BY public.master_items.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    alert_id integer NOT NULL,
    master_item_id integer NOT NULL,
    message text NOT NULL,
    triggered_price_idr double precision,
    triggered_price_usd double precision,
    target_value double precision NOT NULL,
    is_read boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: price_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_alerts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    master_item_id integer NOT NULL,
    alert_type public.alert_type_enum NOT NULL,
    currency public.alert_currency_enum NOT NULL,
    target_value double precision NOT NULL,
    direction public.alert_direction_enum,
    is_active boolean NOT NULL,
    triggered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE public.price_alerts OWNER TO postgres;

--
-- Name: price_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.price_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.price_alerts_id_seq OWNER TO postgres;

--
-- Name: price_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.price_alerts_id_seq OWNED BY public.price_alerts.id;


--
-- Name: price_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_history (
    id integer NOT NULL,
    master_item_id integer NOT NULL,
    lowest_price_idr double precision,
    median_price_idr double precision,
    lowest_price_usd double precision,
    median_price_usd double precision,
    volume integer,
    fetch_status public.fetch_status_enum NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.price_history OWNER TO postgres;

--
-- Name: price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.price_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.price_history_id_seq OWNER TO postgres;

--
-- Name: price_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.price_history_id_seq OWNED BY public.price_history.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(64) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: inventory_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_items_id_seq'::regclass);


--
-- Name: master_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_items ALTER COLUMN id SET DEFAULT nextval('public.master_items_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: price_alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_alerts ALTER COLUMN id SET DEFAULT nextval('public.price_alerts_id_seq'::regclass);


--
-- Name: price_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history ALTER COLUMN id SET DEFAULT nextval('public.price_history_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_settings (key, value, updated_at) FROM stdin;
refresh_interval_minutes	30	2026-06-27 07:41:20.329718+00
steam_currency_idr	9	2026-06-27 07:41:20.329718+00
steam_currency_usd	1	2026-06-27 07:41:20.329718+00
steam_app_id	3678970	2026-06-27 07:41:20.329718+00
steam_request_delay_seconds	3	2026-06-27 07:41:20.329718+00
last_run_at		2026-06-27 07:41:20.329718+00
next_run_at		2026-06-27 07:41:20.329718+00
items_refreshed_last_run	0	2026-06-27 07:41:20.329718+00
items_unavailable_last_run	0	2026-06-27 07:41:20.329718+00
is_running	false	2026-06-27 08:50:39.650713+00
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_items (id, user_id, master_item_id, quantity, notes, added_at, updated_at) FROM stdin;
\.


--
-- Data for Name: master_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.master_items (id, market_hash_name, display_name, item_type, rarity, gear_type, icon_url, created_at) FROM stdin;
1	Kingdom 50th Anniversary Coin	Kingdom 50th Anniversary Coin	Offering Material	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEs8yUelzqKcH6a7Tfse/96fx96f	2026-06-27 08:02:44.956316+00
2	Empire 50th Anniversary Coin	Empire 50th Anniversary Coin	Offering Material	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEs8yUemzqKcHwOasiT6/96fx96f	2026-06-27 08:02:44.96689+00
3	Soulstone - Torment	Soulstone - Torment	Soulstone	UNIQUE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEQ8yUekzqKcHyTvp7Ey/96fx96f	2026-06-27 08:02:44.973065+00
4	Knight Boots (Arcana) A	Knight Boots (Arcana) A	Boots - Lv. 15	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg1PyCFvFVoQ3LPQ/96fx96f	2026-06-27 08:02:44.978366+00
5	Frozen Orb (Arcana) A	Frozen Orb (Arcana) A	Orb - Lv. 15	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUO-kLyVeM2zigU/96fx96f	2026-06-27 08:02:44.983564+00
6	Twilight Amethyst	Twilight Amethyst	Decoration Material	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw6yUekzqKcH8HCWI6_/96fx96f	2026-06-27 08:02:44.98938+00
7	Phantom Emerald	Phantom Emerald	Decoration Material	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw6yUejzqKcH4_yavp3/96fx96f	2026-06-27 08:02:44.995222+00
8	Scroll of Immortal Inscription	Scroll of Immortal Inscription	Inscription Material	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE44yUehzqKcH8fX-NGf/96fx96f	2026-06-27 08:02:44.999886+00
9	Empire 10th Anniversary Coin	Empire 10th Anniversary Coin	Offering Material	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEs8yUekzqKcHzhTD1yF/96fx96f	2026-06-27 08:02:45.005123+00
10	Scroll of Arcana Inscription	Scroll of Arcana Inscription	Inscription Material	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE45yUehzqKcH1Pki_Ke/96fx96f	2026-06-27 08:02:45.011154+00
11	Dice	Dice	Engraving Material	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE84yUejzqKcH2xBhXA3/96fx96f	2026-06-27 08:02:45.015873+00
12	Shadow Bow (Beyond) A	Shadow Bow (Beyond) A	Bow - Lv. 80	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yEC-kLyVyLhsABU/96fx96f	2026-06-27 08:02:45.020027+00
13	Astral Diamond	Astral Diamond	Decoration Material	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw6yUeizqKcH5PFUVdJ/96fx96f	2026-06-27 08:02:45.02536+00
14	Stone	Stone	Crafting Material	COMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk8yUeizqKcH5diC3O5/96fx96f	2026-06-27 08:02:45.030119+00
15	Dimensional Arrow (Arcana) A	Dimensional Arrow (Arcana) A	Arrow - Lv. 80	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeh1_yCFvEI_SUA1w/96fx96f	2026-06-27 08:02:45.034291+00
16	Tempest Staff (Beyond) A	Tempest Staff (Beyond) A	Staff - Lv. 80	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeh1_yCFvFAIV78oQ/96fx96f	2026-06-27 08:02:45.040074+00
17	Limitless Bow (Arcana) A	Limitless Bow (Arcana) A	Bow - Lv. 65	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yEO-kLyVszpW2hw/96fx96f	2026-06-27 08:02:45.046434+00
18	Arcane Ore	Arcane Ore	Crafting Material	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk5yUeizqKcH0-PzwLX/96fx96f	2026-06-27 08:02:45.05009+00
19	Shadow Bow (Arcana) A	Shadow Bow (Arcana) A	Bow - Lv. 80	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yEC-kLyVyLhsABU/96fx96f	2026-06-27 08:02:45.054323+00
20	Scroll of Legendary Inscription	Scroll of Legendary Inscription	Inscription Material	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE4_yUehzqKcHw7kQ1x2/96fx96f	2026-06-27 08:02:45.058201+00
21	Ethereal Amulet (Arcana) A	Ethereal Amulet (Arcana) A	Amulet - Lv. 80	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0eXcCPhXIpdM5WI/96fx96f	2026-06-27 08:02:45.062256+00
22	Minotaur Horn	Minotaur Horn	Engraving Material	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE85yUehzqKcH8N5dLbr/96fx96f	2026-06-27 08:02:45.066528+00
23	Lapis Lazuli	Lapis Lazuli	Decoration Material	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw4yUejzqKcH1P7M0MP/96fx96f	2026-06-27 08:02:45.070559+00
24	Dimensional Helmet (Beyond) A	Dimensional Helmet (Beyond) A	Helmet - Lv. 80	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0eXcCPhXEoKvO14/96fx96f	2026-06-27 08:02:45.074743+00
25	Amethyst	Amethyst	Decoration Material	RARE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw-yUelzqKcH7ua2ZYv/96fx96f	2026-06-27 08:02:45.07944+00
26	Orichalcum Ore	Orichalcum Ore	Crafting Material	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk6yUeizqKcH3aOcmKy/96fx96f	2026-06-27 08:02:45.083113+00
27	Titan Marrow	Titan Marrow	Engraving Material	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE86yUejzqKcH-cYjgFU/96fx96f	2026-06-27 08:02:45.087426+00
28	Dimensional Armor (Beyond) A	Dimensional Armor (Beyond) A	Armor - Lv. 80	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeh1_yCFvGlogEy6A/96fx96f	2026-06-27 08:02:45.091944+00
29	Void Opal	Void Opal	Decoration Material	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw6yUehzqKcH9AR9-QI/96fx96f	2026-06-27 08:02:45.096136+00
30	Ethereal Earring (Immortal) A	Ethereal Earring (Immortal) A	Earing - Lv. 80	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0eXcCPhXpZNNrJY/96fx96f	2026-06-27 08:02:45.099808+00
31	Dimensional Boots (Arcana) A	Dimensional Boots (Arcana) A	Boots - Lv. 80	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeh1_yCFvEB3bNr4w/96fx96f	2026-06-27 08:02:45.104678+00
32	Kingdom 10th Anniversary Coin	Kingdom 10th Anniversary Coin	Offering Material	RARE	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEs8yUejzqKcH_stQcdC/96fx96f	2026-06-27 08:02:45.109418+00
33	Dimensional Armor (Arcana) A	Dimensional Armor (Arcana) A	Armor - Lv. 80	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeh1_yCFvGlogEy6A/96fx96f	2026-06-27 08:02:45.113505+00
34	Kraken Ink	Kraken Ink	Engraving Material	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE86yUeizqKcHyHYY43P/96fx96f	2026-06-27 08:02:45.117183+00
35	Dimensional Gloves (Beyond) A	Dimensional Gloves (Beyond) A	Gloves - Lv. 80	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0eXcCPhX0F0RKKg/96fx96f	2026-06-27 08:02:45.12195+00
36	Basilisk Scale	Basilisk Scale	Engraving Material	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE84yUehzqKcH8PGKm7G/96fx96f	2026-06-27 08:02:45.126146+00
37	Void Ichor	Void Ichor	Engraving Material	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE86yUekzqKcH6Z-opbH/96fx96f	2026-06-27 08:02:45.130312+00
38	Emerald	Emerald	Decoration Material	RARE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw-yUekzqKcH-x4iUkH/96fx96f	2026-06-27 08:02:45.134537+00
39	Dimensional Boots (Beyond) A	Dimensional Boots (Beyond) A	Boots - Lv. 80	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeh1_yCFvEB3bNr4w/96fx96f	2026-06-27 08:02:45.139253+00
40	Copper Nugget	Copper Nugget	Crafting Material	COMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk8yUekzqKcH5ujE5yY/96fx96f	2026-06-27 08:02:45.14396+00
41	Ethereal Ring (Arcana) A	Ethereal Ring (Arcana) A	Ring - Lv. 80	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUanzqKcH8JzrIll/96fx96f	2026-06-27 08:02:45.147646+00
42	Dimensional Sword (Beyond) A	Dimensional Sword (Beyond) A	Sword - Lv. 80	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeh1_yCFvG92Qn9Hg/96fx96f	2026-06-27 08:02:45.151807+00
43	Darksteel Ingot	Darksteel Ingot	Crafting Material	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk6yUehzqKcH0GrVCR-/96fx96f	2026-06-27 08:02:45.156161+00
44	Leather	Leather	Crafting Material	COMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk8yUejzqKcHw9udK7N/96fx96f	2026-06-27 08:02:45.160638+00
45	Diamond	Diamond	Decoration Material	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw4yUehzqKcHyyb1pX1/96fx96f	2026-06-27 08:02:45.165421+00
46	Dimensional Scepter (Beyond) A	Dimensional Scepter (Beyond) A	Scepter - Lv. 80	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OPFVuZePwJ6ZpJ6/96fx96f	2026-06-27 08:02:45.169588+00
47	Soulstone - Hell	Soulstone - Hell	Soulstone	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEQ8yUejzqKcH19gLfqH/96fx96f	2026-06-27 08:02:45.174318+00
48	Dimensional Arrow (Immortal) A	Dimensional Arrow (Immortal) A	Arrow - Lv. 80	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeh1_yCFvEI_SUA1w/96fx96f	2026-06-27 08:02:45.179097+00
49	Soulstone - Normal	Soulstone - Normal	Soulstone	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEQ8yUehzqKcH5CC7Jxm/96fx96f	2026-06-27 08:02:45.182687+00
50	Dimensional Sword (Arcana) A	Dimensional Sword (Arcana) A	Sword - Lv. 80	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeh1_yCFvG92Qn9Hg/96fx96f	2026-06-27 08:02:45.186846+00
51	Dimensional Gloves (Arcana) A	Dimensional Gloves (Arcana) A	Gloves - Lv. 80	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0eXcCPhX0F0RKKg/96fx96f	2026-06-27 08:02:45.191056+00
52	Haste Arrow (Arcana) A	Haste Arrow (Arcana) A	Arrow - Lv. 65	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeh1PyCFvFwJGSIxg/96fx96f	2026-06-27 08:02:45.19578+00
53	Tempest Staff (Arcana) A	Tempest Staff (Arcana) A	Staff - Lv. 80	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeh1_yCFvFAIV78oQ/96fx96f	2026-06-27 08:02:45.199453+00
54	Phoenix Ash	Phoenix Ash	Engraving Material	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE85yUejzqKcH2902pDH/96fx96f	2026-06-27 08:02:45.203633+00
55	Dimensional Scepter (Arcana) A	Dimensional Scepter (Arcana) A	Scepter - Lv. 80	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OPFVuZePwJ6ZpJ6/96fx96f	2026-06-27 08:02:45.208379+00
56	Mystic Armor (Arcana) A	Mystic Armor (Arcana) A	Armor - Lv. 50	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeh0fyCFvFAiQmlUA/96fx96f	2026-06-27 08:02:45.213071+00
57	Scroll of Rare Inscription	Scroll of Rare Inscription	Inscription Material	RARE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE4-yUehzqKcH0itYchZ/96fx96f	2026-06-27 08:02:45.216922+00
58	Ethereal Ring (Immortal) A	Ethereal Ring (Immortal) A	Ring - Lv. 80	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUanzqKcH8JzrIll/96fx96f	2026-06-27 08:02:45.22112+00
59	Vengeance Sword (Arcana) A	Vengeance Sword (Arcana) A	Sword - Lv. 65	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeh1PyCFvFjfF0I7w/96fx96f	2026-06-27 08:02:45.22584+00
60	Dimensional Arrow (Beyond) A	Dimensional Arrow (Beyond) A	Arrow - Lv. 80	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeh1_yCFvEI_SUA1w/96fx96f	2026-06-27 08:02:45.23006+00
61	Dimensional Tome (Arcana) A	Dimensional Tome (Arcana) A	Tome - Lv. 80	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUanzqKcH1KJl9Pc/96fx96f	2026-06-27 08:02:45.234219+00
62	Opal	Opal	Decoration Material	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw4yUeizqKcH3lQRqrM/96fx96f	2026-06-27 08:02:45.238435+00
63	Fate Arrow (Arcana) A	Fate Arrow (Arcana) A	Arrow - Lv. 50	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeh0fyCFvHfSA7suw/96fx96f	2026-06-27 08:02:45.242631+00
64	Thunderstone	Thunderstone	Crafting Material	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk4yUeizqKcH7GMk-FS/96fx96f	2026-06-27 08:02:45.246788+00
65	Shadow Bow (Immortal) A	Shadow Bow (Immortal) A	Bow - Lv. 80	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yEC-kLyVyLhsABU/96fx96f	2026-06-27 08:02:45.251002+00
66	Bloodstone	Bloodstone	Crafting Material	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk4yUehzqKcHxmOrOzz/96fx96f	2026-06-27 08:02:45.255872+00
67	Arcane Crystal	Arcane Crystal	Decoration Material	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw5yUehzqKcH-cvMR9w/96fx96f	2026-06-27 08:02:45.260073+00
68	Sapphire Earring (Arcana) A	Sapphire Earring (Arcana) A	Earing - Lv. 50	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0ePcCPhXtEVUvT8/96fx96f	2026-06-27 08:02:45.264265+00
69	Empire 1st Anniversary Coin	Empire 1st Anniversary Coin	Offering Material	UNCOMMON	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEs8yUeizqKcH8BI083B/96fx96f	2026-06-27 08:02:45.268111+00
70	Soulstone - Nightmare	Soulstone - Nightmare	Soulstone	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEQ8yUeizqKcH5bPx4sH/96fx96f	2026-06-27 08:02:45.273434+00
71	Wraith Essence	Wraith Essence	Engraving Material	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE86yUehzqKcHybpqMQD/96fx96f	2026-06-27 08:02:45.277903+00
72	Mystic Boots (Arcana) A	Mystic Boots (Arcana) A	Boots - Lv. 50	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeh0fyCFvFwkcNL8g/96fx96f	2026-06-27 08:02:45.281583+00
73	Ethereal Amulet (Immortal) A	Ethereal Amulet (Immortal) A	Amulet - Lv. 80	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0eXcCPhXIpdM5WI/96fx96f	2026-06-27 08:02:45.286359+00
74	Mystic Bow (Arcana) A	Mystic Bow (Arcana) A	Bow - Lv. 50	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yEa-kLyVU-v7BBI/96fx96f	2026-06-27 08:02:45.291091+00
75	Ethereal Bracer (Immortal) A	Ethereal Bracer (Immortal) A	Bracer - Lv. 80	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0eXcCPhX8JAhIZU/96fx96f	2026-06-27 08:02:45.295301+00
76	Fate Helmet (Arcana) A	Fate Helmet (Arcana) A	Helmet - Lv. 50	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0ePcCPhXeqSDA1w/96fx96f	2026-06-27 08:02:45.299858+00
77	Dimensional Tome (Beyond) A	Dimensional Tome (Beyond) A	Tome - Lv. 80	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUanzqKcH1KJl9Pc/96fx96f	2026-06-27 08:02:45.30405+00
78	Dimensional Orb (Arcana) A	Dimensional Orb (Arcana) A	Orb - Lv. 80	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yEC-kLyVgwanDxI/96fx96f	2026-06-27 08:02:45.308249+00
79	Mystic Gloves (Arcana) A	Mystic Gloves (Arcana) A	Gloves - Lv. 50	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0ePcCPhXYY6Snj8/96fx96f	2026-06-27 08:02:45.312434+00
80	Dimensional Shield (Arcana) A	Dimensional Shield (Arcana) A	Shield - Lv. 80	ARCANA	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0eXcCPhXxWJg0KQ/96fx96f	2026-06-27 08:02:45.316577+00
81	Shine Armor (Arcana) A	Shine Armor (Arcana) A	Armor - Lv. 65	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeh1PyCFvGccMCVew/96fx96f	2026-06-27 08:02:45.321303+00
82	Mystic Topaz	Mystic Topaz	Decoration Material	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw5yUeizqKcH8NAvJ45/96fx96f	2026-06-27 08:02:45.32602+00
83	Limitless Scepter (Arcana) A	Limitless Scepter (Arcana) A	Scepter - Lv. 65	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OPGVuZeP3yh72a_/96fx96f	2026-06-27 08:02:45.329933+00
84	Griffin Beak	Griffin Beak	Engraving Material	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE85yUeizqKcH_ThvPIp/96fx96f	2026-06-27 08:02:45.334126+00
85	Moonstone Pendant (Arcana) A	Moonstone Pendant (Arcana) A	Amulet - Lv. 30	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0OXcCPhX8iMu0ic/96fx96f	2026-06-27 08:02:45.338831+00
86	Emerald Amulet (Arcana) A	Emerald Amulet (Arcana) A	Amulet - Lv. 50	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0ePcCPhXepQTZ0Y/96fx96f	2026-06-27 08:02:45.343544+00
87	Eclipse Ring (Arcana) A	Eclipse Ring (Arcana) A	Ring - Lv. 65	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUakzqKcH-yZJgVT/96fx96f	2026-06-27 08:02:45.347303+00
88	Shine Boots (Beyond) A	Shine Boots (Beyond) A	Boots - Lv. 65	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeh1PyCFvE_jfhnkA/96fx96f	2026-06-27 08:02:45.351892+00
89	Elite Bow (Beyond) A	Elite Bow (Beyond) A	Bow - Lv. 40	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yU6-kLyVAAf7yE0/96fx96f	2026-06-27 08:02:45.356568+00
90	Moonstone Pendant (Immortal) A	Moonstone Pendant (Immortal) A	Amulet - Lv. 30	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0OXcCPhX8iMu0ic/96fx96f	2026-06-27 08:02:45.361466+00
91	Sacred Staff (Arcana) A	Sacred Staff (Arcana) A	Staff - Lv. 65	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeh1PyCFvG8eqj7kg/96fx96f	2026-06-27 08:02:45.365093+00
92	Scroll of Uncommon Inscription	Scroll of Uncommon Inscription	Inscription Material	UNCOMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE49yUehzqKcH4pWwOrN/96fx96f	2026-06-27 08:02:45.370018+00
93	Enchanted Ruby	Enchanted Ruby	Decoration Material	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw5yUejzqKcH2ygO_Tc/96fx96f	2026-06-27 08:02:45.374731+00
94	Shine Boots (Arcana) A	Shine Boots (Arcana) A	Boots - Lv. 65	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeh1PyCFvE_jfhnkA/96fx96f	2026-06-27 08:02:45.379131+00
95	Demon Blood	Demon Blood	Engraving Material	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE84yUekzqKcH9OtD9wH/96fx96f	2026-06-27 08:02:45.383289+00
96	Shine Gloves (Arcana) A	Shine Gloves (Arcana) A	Gloves - Lv. 65	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0ebcCPhXx04wyoo/96fx96f	2026-06-27 08:02:45.388036+00
97	Pearl	Pearl	Decoration Material	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw_yUeizqKcH9N8U5WV/96fx96f	2026-06-27 08:02:45.392349+00
98	Skull	Skull	Engraving Material	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE8_yUehzqKcH1D5mdoN/96fx96f	2026-06-27 08:02:45.396541+00
99	Eclipse Amulet (Immortal) A	Eclipse Amulet (Immortal) A	Amulet - Lv. 65	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0ebcCPhXEU4z_xU/96fx96f	2026-06-27 08:02:45.400923+00
100	Dimensional Gloves (Immortal) A	Dimensional Gloves (Immortal) A	Gloves - Lv. 80	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0eXcCPhX0F0RKKg/96fx96f	2026-06-27 08:02:45.405119+00
101	War Bow (Arcana) A	War Bow (Arcana) A	Bow - Lv. 20	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUK-kLyVKbrfk38/96fx96f	2026-06-27 08:02:45.410013+00
102	Shine Armor (Beyond) A	Shine Armor (Beyond) A	Armor - Lv. 65	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeh1PyCFvGccMCVew/96fx96f	2026-06-27 08:02:45.413665+00
103	Kingdom 1st Anniversary Coin	Kingdom 1st Anniversary Coin	Offering Material	COMMON	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEs8yUehzqKcH1ZhPJbd/96fx96f	2026-06-27 08:02:45.417841+00
104	Fighter's Helmet (Arcana) A	Fighter's Helmet (Arcana) A	Helmet - Lv. 65	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0ebcCPhXUXZJcBI/96fx96f	2026-06-27 08:02:45.421749+00
105	Garnet	Garnet	Decoration Material	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw_yUekzqKcH3RPkBnz/96fx96f	2026-06-27 08:02:45.426197+00
106	Gale Arrow (Beyond) A	Gale Arrow (Beyond) A	Arrow - Lv. 30	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg1_yCFvEoAKzcFQ/96fx96f	2026-06-27 08:02:45.430401+00
107	War Gloves (Beyond) A	War Gloves (Beyond) A	Gloves - Lv. 30	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0OXcCPhX96Wmmc4/96fx96f	2026-06-27 08:02:45.434589+00
108	Gale Arrow (Arcana) A	Gale Arrow (Arcana) A	Arrow - Lv. 30	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg1_yCFvEoAKzcFQ/96fx96f	2026-06-27 08:02:45.438794+00
109	Dusk Bow (Beyond) A	Dusk Bow (Beyond) A	Bow - Lv. 30	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUC-kLyV4niTZto/96fx96f	2026-06-27 08:02:45.443994+00
110	Azure Arrow (Arcana) A	Azure Arrow (Arcana) A	Arrow - Lv. 20	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg1fyCFvFfpxKh7A/96fx96f	2026-06-27 08:02:45.448216+00
111	Fate Helmet (Beyond) A	Fate Helmet (Beyond) A	Helmet - Lv. 50	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0ePcCPhXeqSDA1w/96fx96f	2026-06-27 08:02:45.452817+00
112	Dusk Bow (Arcana) A	Dusk Bow (Arcana) A	Bow - Lv. 30	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUC-kLyV4niTZto/96fx96f	2026-06-27 08:02:45.45718+00
113	Mystic Gloves (Beyond) A	Mystic Gloves (Beyond) A	Gloves - Lv. 50	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0ePcCPhXYY6Snj8/96fx96f	2026-06-27 08:02:45.461366+00
114	Emerald Bracer (Immortal) A	Emerald Bracer (Immortal) A	Bracer - Lv. 50	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0ePcCPhXWrmmDA4/96fx96f	2026-06-27 08:02:45.466069+00
115	Platinum Earring (Immortal) A	Platinum Earring (Immortal) A	Earing - Lv. 20	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0OfcCPhXdb0rqnM/96fx96f	2026-06-27 08:02:45.471401+00
116	Knight's Armor (Arcana) A	Knight's Armor (Arcana) A	Armor - Lv. 20	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg1fyCFvETj4jKdQ/96fx96f	2026-06-27 08:02:45.47697+00
117	Turquoise	Turquoise	Decoration Material	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw_yUejzqKcH7vcACro/96fx96f	2026-06-27 08:02:45.48169+00
118	Dimensional Helmet (Immortal) A	Dimensional Helmet (Immortal) A	Helmet - Lv. 80	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0eXcCPhXEoKvO14/96fx96f	2026-06-27 08:02:45.488089+00
119	Obsidian Shard	Obsidian Shard	Decoration Material	UNCOMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw9yUehzqKcH8v9Hz6A/96fx96f	2026-06-27 08:02:45.493026+00
120	Shine Gloves (Beyond) A	Shine Gloves (Beyond) A	Gloves - Lv. 65	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0ebcCPhXx04wyoo/96fx96f	2026-06-27 08:02:45.497876+00
121	Rapier (Immortal) A	Rapier (Immortal) A	Sword - Lv. 10	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg0_yCFvGwgSQrvQ/96fx96f	2026-06-27 08:02:45.502175+00
122	Amethyst Ring (Arcana) A	Amethyst Ring (Arcana) A	Ring - Lv. 40	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUepzqKcH-aAVkoC/96fx96f	2026-06-27 08:02:45.50796+00
123	Emerald Amulet (Immortal) A	Emerald Amulet (Immortal) A	Amulet - Lv. 50	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0ePcCPhXepQTZ0Y/96fx96f	2026-06-27 08:02:45.512649+00
124	Blessed Tome (Arcana) A	Blessed Tome (Arcana) A	Tome - Lv. 20	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUelzqKcH-zA_Kwc/96fx96f	2026-06-27 08:02:45.517411+00
125	Mystic Bow (Beyond) A	Mystic Bow (Beyond) A	Bow - Lv. 50	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yEa-kLyVU-v7BBI/96fx96f	2026-06-27 08:02:45.52264+00
126	Sage Staff (Beyond) A	Sage Staff (Beyond) A	Staff - Lv. 30	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg1_yCFvHRersiOQ/96fx96f	2026-06-27 08:02:45.52734+00
127	War Armor (Beyond) A	War Armor (Beyond) A	Armor - Lv. 30	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg1_yCFvFPcJMXJw/96fx96f	2026-06-27 08:02:45.532908+00
128	Obsidian Bracer (Arcana) A	Obsidian Bracer (Arcana) A	Bracer - Lv. 30	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0OXcCPhXfiUZCNU/96fx96f	2026-06-27 08:02:45.538167+00
129	Crimson Bracer (Arcana) A	Crimson Bracer (Arcana) A	Bracer - Lv. 40	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0OvcCPhXsCuXqDA/96fx96f	2026-06-27 08:02:45.543435+00
130	Emerald Earring (Arcana) A	Emerald Earring (Arcana) A	Earing - Lv. 30	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0OXcCPhXjPaYdDM/96fx96f	2026-06-27 08:02:45.54822+00
131	War Helmet (Beyond) A	War Helmet (Beyond) A	Helmet - Lv. 30	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0OXcCPhXY1Y7hD4/96fx96f	2026-06-27 08:02:45.553124+00
132	Chain Gloves (Arcana) A	Chain Gloves (Arcana) A	Gloves - Lv. 20	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0OfcCPhXGQ3O2SU/96fx96f	2026-06-27 08:02:45.559187+00
133	War Helmet (Arcana) A	War Helmet (Arcana) A	Helmet - Lv. 30	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0OXcCPhXY1Y7hD4/96fx96f	2026-06-27 08:02:45.564037+00
134	Chain Boots (Arcana) A	Chain Boots (Arcana) A	Boots - Lv. 20	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg1fyCFvEubPTQCg/96fx96f	2026-06-27 08:02:45.568224+00
135	Dimensional Sword (Immortal) A	Dimensional Sword (Immortal) A	Sword - Lv. 80	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeh1_yCFvG92Qn9Hg/96fx96f	2026-06-27 08:02:45.573463+00
136	Black Pearl	Black Pearl	Decoration Material	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw4yUekzqKcH990Y8xz/96fx96f	2026-06-27 08:02:45.578224+00
137	Spider Silk	Spider Silk	Engraving Material	UNCOMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE89yUeizqKcHxn3qDOR/96fx96f	2026-06-27 08:02:45.582651+00
138	Limitless Bow (Immortal) A	Limitless Bow (Immortal) A	Bow - Lv. 65	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yEO-kLyVszpW2hw/96fx96f	2026-06-27 08:02:45.588214+00
139	Chain Helmet (Arcana) A	Chain Helmet (Arcana) A	Helmet - Lv. 20	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0OfcCPhX8fKtIQA/96fx96f	2026-06-27 08:02:45.593478+00
140	War Boots (Beyond) A	War Boots (Beyond) A	Boots - Lv. 30	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg1_yCFvECe6wQxQ/96fx96f	2026-06-27 08:02:45.598734+00
141	War Armor (Arcana) A	War Armor (Arcana) A	Armor - Lv. 30	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg1_yCFvFPcJMXJw/96fx96f	2026-06-27 08:02:45.602934+00
142	Dimensional Armor (Immortal) A	Dimensional Armor (Immortal) A	Armor - Lv. 80	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeh1_yCFvGlogEy6A/96fx96f	2026-06-27 08:02:45.609219+00
143	Emerald Earring (Immortal) A	Emerald Earring (Immortal) A	Earing - Lv. 30	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0OXcCPhXjPaYdDM/96fx96f	2026-06-27 08:02:45.613932+00
144	Tempest Staff (Immortal) A	Tempest Staff (Immortal) A	Staff - Lv. 80	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeh1_yCFvFAIV78oQ/96fx96f	2026-06-27 08:02:45.618647+00
145	Ruby	Ruby	Decoration Material	RARE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw-yUehzqKcH7cedjpL/96fx96f	2026-06-27 08:02:45.62401+00
146	Fighter's Helmet (Beyond) A	Fighter's Helmet (Beyond) A	Helmet - Lv. 65	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0ebcCPhXUXZJcBI/96fx96f	2026-06-27 08:02:45.629038+00
147	Amber Ring (Immortal) A	Amber Ring (Immortal) A	Ring - Lv. 30	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUenzqKcH1K5IKZS/96fx96f	2026-06-27 08:02:45.633228+00
148	Devout Scepter (Beyond) A	Devout Scepter (Beyond) A	Scepter - Lv. 30	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLFVuZePyB0WdV3/96fx96f	2026-06-27 08:02:45.639566+00
149	Dimensional Orb (Beyond) A	Dimensional Orb (Beyond) A	Orb - Lv. 80	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yEC-kLyVgwanDxI/96fx96f	2026-06-27 08:02:45.644837+00
150	Elite Bow (Arcana) A	Elite Bow (Arcana) A	Bow - Lv. 40	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yU6-kLyVAAf7yE0/96fx96f	2026-06-27 08:02:45.649011+00
151	Emerald Amulet (Legendary) A	Emerald Amulet (Legendary) A	Amulet - Lv. 50	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0ePcCPhXepQTZ0Y/96fx96f	2026-06-27 08:02:45.654364+00
152	Comet Staff (Arcana) A	Comet Staff (Arcana) A	Staff - Lv. 40	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg2fyCFvEJFJCPlA/96fx96f	2026-06-27 08:02:45.659035+00
153	Radiant Shield (Arcana) A	Radiant Shield (Arcana) A	Shield - Lv. 65	ARCANA	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0ebcCPhXDAht7Z8/96fx96f	2026-06-27 08:02:45.663858+00
154	Rune Boots (Beyond) A	Rune Boots (Beyond) A	Boots - Lv. 40	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg2fyCFvEq2VjeoA/96fx96f	2026-06-27 08:02:45.668818+00
155	Emerald Ring (Arcana) A	Emerald Ring (Arcana) A	Ring - Lv. 50	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUahzqKcH4PcE8f0/96fx96f	2026-06-27 08:02:45.674089+00
156	Rune Boots (Arcana) A	Rune Boots (Arcana) A	Boots - Lv. 40	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg2fyCFvEq2VjeoA/96fx96f	2026-06-27 08:02:45.678811+00
157	Dimensional Scepter (Immortal) A	Dimensional Scepter (Immortal) A	Scepter - Lv. 80	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OPFVuZePwJ6ZpJ6/96fx96f	2026-06-27 08:02:45.683146+00
158	Platinum Amulet (Immortal) A	Platinum Amulet (Immortal) A	Amulet - Lv. 20	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0OfcCPhXTuz4Iig/96fx96f	2026-06-27 08:02:45.687851+00
159	Iron Helmet (Immortal) A	Iron Helmet (Immortal) A	Helmet - Lv. 10	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0OHcCPhXUubWbDw/96fx96f	2026-06-27 08:02:45.692296+00
160	Warrior's Tome (Arcana) A	Warrior's Tome (Arcana) A	Tome - Lv. 65	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUakzqKcHwEnwhoR/96fx96f	2026-06-27 08:02:45.697021+00
161	Dimensional Boots (Immortal) A	Dimensional Boots (Immortal) A	Boots - Lv. 80	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeh1_yCFvEB3bNr4w/96fx96f	2026-06-27 08:02:45.701785+00
162	Prophecy Orb (Arcana) A	Prophecy Orb (Arcana) A	Orb - Lv. 20	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUK-kLyVNlQRhs8/96fx96f	2026-06-27 08:02:45.705983+00
163	Dimensional Crossbow (Arcana) A	Dimensional Crossbow (Arcana) A	Crossbow - Lv. 80	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLDT7hANiZzqnrtag/96fx96f	2026-06-27 08:02:45.710571+00
164	Platinum Ring (Immortal) A	Platinum Ring (Immortal) A	Ring - Lv. 20	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUelzqKcH5E5PsGV/96fx96f	2026-06-27 08:02:45.715346+00
165	Dimensional Crossbow (Beyond) A	Dimensional Crossbow (Beyond) A	Crossbow - Lv. 80	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLDT7hANiZzqnrtag/96fx96f	2026-06-27 08:02:45.720082+00
166	Ancient Orb (Arcana) A	Ancient Orb (Arcana) A	Orb - Lv. 65	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yEO-kLyVTBNejeo/96fx96f	2026-06-27 08:02:45.724813+00
167	Rune Scepter (Arcana) A	Rune Scepter (Arcana) A	Scepter - Lv. 40	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLLVuZeP5zZxr6M/96fx96f	2026-06-27 08:02:45.72905+00
168	Dimensional Bolt (Arcana) A	Dimensional Bolt (Arcana) A	Bolt - Lv. 80	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUanzqKcH0krde5M/96fx96f	2026-06-27 08:02:45.733303+00
169	Rune Sword (Immortal) A	Rune Sword (Immortal) A	Sword - Lv. 40	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg2fyCFvEdOMjfnQ/96fx96f	2026-06-27 08:02:45.738048+00
170	Void Staff (Beyond) A	Void Staff (Beyond) A	Staff - Lv. 50	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeh0fyCFvH12Iir3g/96fx96f	2026-06-27 08:02:45.742657+00
171	Haste Arrow (Immortal) A	Haste Arrow (Immortal) A	Arrow - Lv. 65	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeh1PyCFvFwJGSIxg/96fx96f	2026-06-27 08:02:45.747412+00
172	Mystic Orb (Arcana) A	Mystic Orb (Arcana) A	Orb - Lv. 50	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yEa-kLyVub0IWyA/96fx96f	2026-06-27 08:02:45.752183+00
173	Rune Scepter (Immortal) A	Rune Scepter (Immortal) A	Scepter - Lv. 40	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLLVuZeP5zZxr6M/96fx96f	2026-06-27 08:02:45.757453+00
174	Chaos Shard	Chaos Shard	Crafting Material	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk5yUehzqKcH2O0ZKDU/96fx96f	2026-06-27 08:02:45.76118+00
175	Eclipse Bracer (Immortal) A	Eclipse Bracer (Immortal) A	Bracer - Lv. 65	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0ebcCPhXeU60l4g/96fx96f	2026-06-27 08:02:45.766585+00
176	Celestial Earring (Beyond) A	Celestial Earring (Beyond) A	Earing - Lv. 65	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0ebcCPhXqWAXTyY/96fx96f	2026-06-27 08:02:45.771821+00
177	War Armor (Immortal) A	War Armor (Immortal) A	Armor - Lv. 30	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg1_yCFvFPcJMXJw/96fx96f	2026-06-27 08:02:45.777387+00
178	Warrior's Tome (Beyond) A	Warrior's Tome (Beyond) A	Tome - Lv. 65	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUakzqKcHwEnwhoR/96fx96f	2026-06-27 08:02:45.782618+00
179	Barbed Arrow (Arcana) A	Barbed Arrow (Arcana) A	Arrow - Lv. 15	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg1PyCFvHJm9yN-w/96fx96f	2026-06-27 08:02:45.787872+00
180	Dimensional Sword (Legendary) A	Dimensional Sword (Legendary) A	Sword - Lv. 80	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeh1_yCFvG92Qn9Hg/96fx96f	2026-06-27 08:02:45.793072+00
181	Rune Plate (Arcana) A	Rune Plate (Arcana) A	Armor - Lv. 40	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg2fyCFvHr7pwHMg/96fx96f	2026-06-27 08:02:45.797803+00
182	War Tome (Arcana) A	War Tome (Arcana) A	Tome - Lv. 30	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUenzqKcH57T8ExQ/96fx96f	2026-06-27 08:02:45.801996+00
183	Rune Sword (Arcana) A	Rune Sword (Arcana) A	Sword - Lv. 40	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg2fyCFvEdOMjfnQ/96fx96f	2026-06-27 08:02:45.806757+00
184	Fate Tome (Arcana) A	Fate Tome (Arcana) A	Tome - Lv. 50	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUahzqKcH5qU-uNa/96fx96f	2026-06-27 08:02:45.81151+00
185	Rune Arrow (Arcana) A	Rune Arrow (Arcana) A	Arrow - Lv. 40	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg2fyCFvFmQa68uw/96fx96f	2026-06-27 08:02:45.815701+00
186	War Boots (Arcana) A	War Boots (Arcana) A	Boots - Lv. 30	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg1_yCFvECe6wQxQ/96fx96f	2026-06-27 08:02:45.819898+00
187	Dragon Bile	Dragon Bile	Engraving Material	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE85yUekzqKcH3Dqz1IF/96fx96f	2026-06-27 08:02:45.824677+00
188	Blessed Scepter (Immortal) A	Blessed Scepter (Immortal) A	Scepter - Lv. 10	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLBVuZeP82585JP/96fx96f	2026-06-27 08:02:45.829403+00
189	Rune Plate (Beyond) A	Rune Plate (Beyond) A	Armor - Lv. 40	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg2fyCFvHr7pwHMg/96fx96f	2026-06-27 08:02:45.832549+00
190	Rune Tome (Arcana) A	Rune Tome (Arcana) A	Tome - Lv. 40	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUepzqKcHw2Z9icR/96fx96f	2026-06-27 08:02:45.837418+00
191	Sacred Staff (Immortal) A	Sacred Staff (Immortal) A	Staff - Lv. 65	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeh1PyCFvG8eqj7kg/96fx96f	2026-06-27 08:02:45.842668+00
192	Rune Orb (Beyond) A	Rune Orb (Beyond) A	Orb - Lv. 30	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUC-kLyV2eT-7fM/96fx96f	2026-06-27 08:02:45.846918+00
193	Chain Mail (Immortal) A	Chain Mail (Immortal) A	Armor - Lv. 15	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg1PyCFvFBvEhIBw/96fx96f	2026-06-27 08:02:45.850552+00
194	Sacred Scepter (Arcana) A	Sacred Scepter (Arcana) A	Scepter - Lv. 20	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLHVuZePy2pWIXu/96fx96f	2026-06-27 08:02:45.856407+00
195	Steel Scepter (Immortal) A	Steel Scepter (Immortal) A	Scepter - Lv. 15	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLGVuZePz9BcabE/96fx96f	2026-06-27 08:02:45.860625+00
196	Steel Scepter (Arcana) A	Steel Scepter (Arcana) A	Scepter - Lv. 15	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLGVuZePz9BcabE/96fx96f	2026-06-27 08:02:45.865369+00
197	War Helmet (Immortal) A	War Helmet (Immortal) A	Helmet - Lv. 30	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0OXcCPhXY1Y7hD4/96fx96f	2026-06-27 08:02:45.86999+00
198	Rune Helmet (Arcana) A	Rune Helmet (Arcana) A	Helmet - Lv. 40	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0OvcCPhXW4qeX9E/96fx96f	2026-06-27 08:02:45.874681+00
199	War Bow (Immortal) A	War Bow (Immortal) A	Bow - Lv. 20	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUK-kLyVKbrfk38/96fx96f	2026-06-27 08:02:45.878901+00
200	Elite Bow (Immortal) A	Elite Bow (Immortal) A	Bow - Lv. 40	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yU6-kLyVAAf7yE0/96fx96f	2026-06-27 08:02:45.883757+00
201	War Gloves (Arcana) A	War Gloves (Arcana) A	Gloves - Lv. 30	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0OXcCPhX96Wmmc4/96fx96f	2026-06-27 08:02:45.887955+00
202	Long Bow (Immortal) A	Long Bow (Immortal) A	Bow - Lv. 10	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUS-kLyVQRqvOk4/96fx96f	2026-06-27 08:02:45.893193+00
203	Celestial Earring (Immortal) A	Celestial Earring (Immortal) A	Earing - Lv. 65	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0ebcCPhXqWAXTyY/96fx96f	2026-06-27 08:02:45.897521+00
204	Azure Arrow (Immortal) A	Azure Arrow (Immortal) A	Arrow - Lv. 20	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg1fyCFvFfpxKh7A/96fx96f	2026-06-27 08:02:45.902286+00
205	Iron Boots (Immortal) A	Iron Boots (Immortal) A	Boots - Lv. 10	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg0_yCFvHI2ln9rA/96fx96f	2026-06-27 08:02:45.906975+00
206	Rune Arrow (Beyond) A	Rune Arrow (Beyond) A	Arrow - Lv. 40	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg2fyCFvFmQa68uw/96fx96f	2026-06-27 08:02:45.911647+00
207	Eclipse Ring (Immortal) A	Eclipse Ring (Immortal) A	Ring - Lv. 65	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUakzqKcH-yZJgVT/96fx96f	2026-06-27 08:02:45.91643+00
208	Ethereal Bracer (Legendary) A	Ethereal Bracer (Legendary) A	Bracer - Lv. 80	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0eXcCPhX8JAhIZU/96fx96f	2026-06-27 08:02:45.922075+00
209	Harpy Feather	Harpy Feather	Engraving Material	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE8_yUeizqKcH_84G2al/96fx96f	2026-06-27 08:02:45.926772+00
210	Platinum Earring (Legendary) A	Platinum Earring (Legendary) A	Earing - Lv. 20	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0OfcCPhXdb0rqnM/96fx96f	2026-06-27 08:02:45.93153+00
211	Dimensional Shield (Beyond) A	Dimensional Shield (Beyond) A	Shield - Lv. 80	BEYOND	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0eXcCPhXxWJg0KQ/96fx96f	2026-06-27 08:02:45.935288+00
212	Azure Staff (Arcana) A	Azure Staff (Arcana) A	Staff - Lv. 20	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg1fyCFvGu9-QAoA/96fx96f	2026-06-27 08:02:45.940047+00
213	Void Iron	Void Iron	Crafting Material	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk_yUeizqKcHxmHpgxD/96fx96f	2026-06-27 08:02:45.945321+00
214	Crimson Bracer (Immortal) A	Crimson Bracer (Immortal) A	Bracer - Lv. 40	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0OvcCPhXsCuXqDA/96fx96f	2026-06-27 08:02:45.950065+00
215	Composite Bow (Arcana) A	Composite Bow (Arcana) A	Bow - Lv. 15	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUO-kLyVm2WtmGs/96fx96f	2026-06-27 08:02:45.954221+00
216	Starlight Sapphire	Starlight Sapphire	Decoration Material	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw5yUekzqKcH_ezFaja/96fx96f	2026-06-27 08:02:45.959121+00
217	Ruby Pendant (Legendary) A	Ruby Pendant (Legendary) A	Amulet - Lv. 40	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0OvcCPhX0moUmfY/96fx96f	2026-06-27 08:02:45.963307+00
218	Comet Staff (Immortal) A	Comet Staff (Immortal) A	Staff - Lv. 40	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg2fyCFvEJFJCPlA/96fx96f	2026-06-27 08:02:45.969153+00
219	Platinum Bracer (Arcana) A	Platinum Bracer (Arcana) A	Bracer - Lv. 20	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0OfcCPhXsMcZPhQ/96fx96f	2026-06-27 08:02:45.975506+00
220	Rune Gloves (Beyond) A	Rune Gloves (Beyond) A	Gloves - Lv. 40	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0OvcCPhXyYYLRhY/96fx96f	2026-06-27 08:02:45.981097+00
221	Long Staff (Immortal) A	Long Staff (Immortal) A	Staff - Lv. 10	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg0_yCFvFYzowVqg/96fx96f	2026-06-27 08:02:45.985777+00
222	Platinum Amulet (Legendary) A	Platinum Amulet (Legendary) A	Amulet - Lv. 20	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0OfcCPhXTuz4Iig/96fx96f	2026-06-27 08:02:45.991617+00
223	Fate Scepter (Arcana) A	Fate Scepter (Arcana) A	Scepter - Lv. 50	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OPDVuZeP5tUN1fA/96fx96f	2026-06-27 08:02:45.995818+00
224	Fate Sword (Arcana) A	Fate Sword (Arcana) A	Sword - Lv. 50	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeh0fyCFvHkGrR9DA/96fx96f	2026-06-27 08:02:46.000537+00
225	Amber Gem	Amber Gem	Decoration Material	UNCOMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw9yUekzqKcHy_IhoYK/96fx96f	2026-06-27 08:02:46.005306+00
226	Rune Gloves (Arcana) A	Rune Gloves (Arcana) A	Gloves - Lv. 40	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0OvcCPhXyYYLRhY/96fx96f	2026-06-27 08:02:46.009825+00
227	Platinum Bracer (Immortal) A	Platinum Bracer (Immortal) A	Bracer - Lv. 20	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0OfcCPhXsMcZPhQ/96fx96f	2026-06-27 08:02:46.014431+00
228	Knight Helmet (Arcana) A	Knight Helmet (Arcana) A	Helmet - Lv. 15	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0ObcCPhXz6yFpDk/96fx96f	2026-06-27 08:02:46.018598+00
229	Leather Gloves (Immortal) A	Leather Gloves (Immortal) A	Gloves - Lv. 1	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0OPcCPhXg2wWg_Y/96fx96f	2026-06-27 08:02:46.023341+00
230	Platinum Ring (Legendary) A	Platinum Ring (Legendary) A	Ring - Lv. 20	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUelzqKcH5E5PsGV/96fx96f	2026-06-27 08:02:46.027024+00
231	Vengeance Sword (Immortal) A	Vengeance Sword (Immortal) A	Sword - Lv. 65	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeh1PyCFvFjfF0I7w/96fx96f	2026-06-27 08:02:46.031247+00
232	Arcane Orb (Arcana) A	Arcane Orb (Arcana) A	Orb - Lv. 40	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yU6-kLyV74qLg9Q/96fx96f	2026-06-27 08:02:46.035243+00
233	Knight Gloves (Immortal) A	Knight Gloves (Immortal) A	Gloves - Lv. 15	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0ObcCPhXzqQSg_4/96fx96f	2026-06-27 08:02:46.039437+00
234	Wooden Boots (Immortal) A	Wooden Boots (Immortal) A	Boots - Lv. 1	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg0fyCFvFJsI2YzQ/96fx96f	2026-06-27 08:02:46.043639+00
235	Iron Plate (Immortal) A	Iron Plate (Immortal) A	Armor - Lv. 10	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg0_yCFvGgq5PtrA/96fx96f	2026-06-27 08:02:46.047853+00
236	Moonstone Pendant (Legendary) A	Moonstone Pendant (Legendary) A	Amulet - Lv. 30	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0OXcCPhX8iMu0ic/96fx96f	2026-06-27 08:02:46.051549+00
237	Silver Amulet (Immortal) A	Silver Amulet (Immortal) A	Amulet - Lv. 10	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0OHcCPhXHPkUH5g/96fx96f	2026-06-27 08:02:46.055785+00
238	Rune Scepter (Beyond) A	Rune Scepter (Beyond) A	Scepter - Lv. 40	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLLVuZeP5zZxr6M/96fx96f	2026-06-27 08:02:46.060531+00
239	Shadow Bow (Legendary) A	Shadow Bow (Legendary) A	Bow - Lv. 80	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yEC-kLyVyLhsABU/96fx96f	2026-06-27 08:02:46.063729+00
240	Fate Scepter (Beyond) A	Fate Scepter (Beyond) A	Scepter - Lv. 50	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OPDVuZeP5tUN1fA/96fx96f	2026-06-27 08:02:46.068291+00
241	Knight Sword (Arcana) A	Knight Sword (Arcana) A	Sword - Lv. 30	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg1_yCFvFztzlr8A/96fx96f	2026-06-27 08:02:46.073467+00
242	Minor Emerald	Minor Emerald	Decoration Material	COMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw8yUekzqKcH3anKO86/96fx96f	2026-06-27 08:02:46.077463+00
243	Emerald Ring (Immortal) A	Emerald Ring (Immortal) A	Ring - Lv. 50	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUahzqKcH4PcE8f0/96fx96f	2026-06-27 08:02:46.081656+00
244	Silver Ring (Immortal) A	Silver Ring (Immortal) A	Ring - Lv. 10	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUejzqKcH8o0-3tp/96fx96f	2026-06-27 08:02:46.085326+00
245	Void Staff (Arcana) A	Void Staff (Arcana) A	Staff - Lv. 50	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeh0fyCFvH12Iir3g/96fx96f	2026-06-27 08:02:46.091843+00
246	Rune Helmet (Immortal) A	Rune Helmet (Immortal) A	Helmet - Lv. 40	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0OvcCPhXW4qeX9E/96fx96f	2026-06-27 08:02:46.099816+00
247	Tiger Eye Earring (Immortal) A	Tiger Eye Earring (Immortal) A	Earing - Lv. 40	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0OvcCPhXkF8v7E4/96fx96f	2026-06-27 08:02:46.107272+00
248	Great Sword (Arcana) A	Great Sword (Arcana) A	Sword - Lv. 20	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg1fyCFvGJsiZzxA/96fx96f	2026-06-27 08:02:46.115168+00
249	Dimensional Arrow (Legendary) A	Dimensional Arrow (Legendary) A	Arrow - Lv. 80	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeh1_yCFvEI_SUA1w/96fx96f	2026-06-27 08:02:46.122069+00
250	Shine Armor (Immortal) A	Shine Armor (Immortal) A	Armor - Lv. 65	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeh1PyCFvGccMCVew/96fx96f	2026-06-27 08:02:46.127407+00
251	Mystic Armor (Immortal) A	Mystic Armor (Immortal) A	Armor - Lv. 50	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeh0fyCFvFAiQmlUA/96fx96f	2026-06-27 08:02:46.13165+00
252	Knight Gloves (Arcana) A	Knight Gloves (Arcana) A	Gloves - Lv. 15	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0ObcCPhXzqQSg_4/96fx96f	2026-06-27 08:02:46.137035+00
253	Scroll of Common Inscription	Scroll of Common Inscription	Inscription Material	COMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE48yUehzqKcH49PpVTj/96fx96f	2026-06-27 08:02:46.142849+00
254	Chain Boots (Immortal) A	Chain Boots (Immortal) A	Boots - Lv. 20	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg1fyCFvEubPTQCg/96fx96f	2026-06-27 08:02:46.147112+00
255	Witch Staff (Immortal) A	Witch Staff (Immortal) A	Staff - Lv. 15	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg1PyCFvHlezTlDg/96fx96f	2026-06-27 08:02:46.15175+00
256	Shine Gloves (Immortal) A	Shine Gloves (Immortal) A	Gloves - Lv. 65	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0ebcCPhXx04wyoo/96fx96f	2026-06-27 08:02:46.156484+00
257	Arcane Orb (Beyond) A	Arcane Orb (Beyond) A	Orb - Lv. 40	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yU6-kLyV74qLg9Q/96fx96f	2026-06-27 08:02:46.160869+00
258	Obsidian Bracer (Immortal) A	Obsidian Bracer (Immortal) A	Bracer - Lv. 30	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0OXcCPhXfiUZCNU/96fx96f	2026-06-27 08:02:46.164349+00
259	Rune Gloves (Immortal) A	Rune Gloves (Immortal) A	Gloves - Lv. 40	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0OvcCPhXyYYLRhY/96fx96f	2026-06-27 08:02:46.170601+00
260	Rune Orb (Arcana) A	Rune Orb (Arcana) A	Orb - Lv. 30	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUC-kLyV2eT-7fM/96fx96f	2026-06-27 08:02:46.1764+00
261	Wooden Armor (Immortal) A	Wooden Armor (Immortal) A	Armor - Lv. 1	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg0fyCFvFGGUuVGA/96fx96f	2026-06-27 08:02:46.181667+00
262	Bastard Sword (Immortal) A	Bastard Sword (Immortal) A	Sword - Lv. 15	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg1PyCFvEcxA7LDg/96fx96f	2026-06-27 08:02:46.18638+00
263	Chain Helmet (Immortal) A	Chain Helmet (Immortal) A	Helmet - Lv. 20	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0OfcCPhX8fKtIQA/96fx96f	2026-06-27 08:02:46.191516+00
264	Coral Piece	Coral Piece	Decoration Material	UNCOMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw9yUeizqKcH0tmeyHr/96fx96f	2026-06-27 08:02:46.195731+00
265	Emerald Earring (Beyond) A	Emerald Earring (Beyond) A	Earing - Lv. 30	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0OXcCPhXjPaYdDM/96fx96f	2026-06-27 08:02:46.199924+00
266	Witch Staff (Arcana) A	Witch Staff (Arcana) A	Staff - Lv. 15	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg1PyCFvHlezTlDg/96fx96f	2026-06-27 08:02:46.205841+00
267	Hunter's Arrow (Immortal) A	Hunter's Arrow (Immortal) A	Arrow - Lv. 10	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg0_yCFvHIS02ZUQ/96fx96f	2026-06-27 08:02:46.211039+00
268	Fate Arrow (Beyond) A	Fate Arrow (Beyond) A	Arrow - Lv. 50	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeh0fyCFvHfSA7suw/96fx96f	2026-06-27 08:02:46.215233+00
269	Sage Staff (Immortal) A	Sage Staff (Immortal) A	Staff - Lv. 30	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg1_yCFvHRersiOQ/96fx96f	2026-06-27 08:02:46.222172+00
270	Devout Scepter (Arcana) A	Devout Scepter (Arcana) A	Scepter - Lv. 30	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLFVuZePyB0WdV3/96fx96f	2026-06-27 08:02:46.229095+00
271	Limitless Scepter (Immortal) A	Limitless Scepter (Immortal) A	Scepter - Lv. 65	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OPGVuZeP3yh72a_/96fx96f	2026-06-27 08:02:46.233272+00
272	Iron Bolt (Arcana) A	Iron Bolt (Arcana) A	Bolt - Lv. 30	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUenzqKcH_Bxa_RF/96fx96f	2026-06-27 08:02:46.238582+00
273	Mystic Shield (Arcana) A	Mystic Shield (Arcana) A	Shield - Lv. 50	ARCANA	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0ePcCPhXXlwYl6o/96fx96f	2026-06-27 08:02:46.243827+00
274	Knight's Armor (Immortal) A	Knight's Armor (Immortal) A	Armor - Lv. 20	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg1fyCFvETj4jKdQ/96fx96f	2026-06-27 08:02:46.248662+00
275	Fate Scepter (Immortal) A	Fate Scepter (Immortal) A	Scepter - Lv. 50	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OPDVuZeP5tUN1fA/96fx96f	2026-06-27 08:02:46.253988+00
276	Tiger Eye Earring (Beyond) A	Tiger Eye Earring (Beyond) A	Earing - Lv. 40	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0OvcCPhXkF8v7E4/96fx96f	2026-06-27 08:02:46.259767+00
277	Amethyst Ring (Beyond) A	Amethyst Ring (Beyond) A	Ring - Lv. 40	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUepzqKcH-aAVkoC/96fx96f	2026-06-27 08:02:46.263964+00
278	Sacred Staff (Beyond) A	Sacred Staff (Beyond) A	Staff - Lv. 65	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeh1PyCFvG8eqj7kg/96fx96f	2026-06-27 08:02:46.268851+00
279	Minor Topaz	Minor Topaz	Decoration Material	COMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw8yUejzqKcHzzzPvQ-/96fx96f	2026-06-27 08:02:46.274361+00
280	Long Staff (Legendary) A	Long Staff (Legendary) A	Staff - Lv. 10	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg0_yCFvFYzowVqg/96fx96f	2026-06-27 08:02:46.279097+00
281	Rune Helmet (Beyond) A	Rune Helmet (Beyond) A	Helmet - Lv. 40	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0OvcCPhXW4qeX9E/96fx96f	2026-06-27 08:02:46.283894+00
282	Chain Mail (Arcana) A	Chain Mail (Arcana) A	Armor - Lv. 15	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg1PyCFvFBvEhIBw/96fx96f	2026-06-27 08:02:46.289566+00
283	Bastard Sword (Arcana) A	Bastard Sword (Arcana) A	Sword - Lv. 15	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg1PyCFvEcxA7LDg/96fx96f	2026-06-27 08:02:46.294779+00
284	Rune Sword (Beyond) A	Rune Sword (Beyond) A	Sword - Lv. 40	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg2fyCFvEdOMjfnQ/96fx96f	2026-06-27 08:02:46.301155+00
285	Composite Bow (Immortal) A	Composite Bow (Immortal) A	Bow - Lv. 15	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUO-kLyVm2WtmGs/96fx96f	2026-06-27 08:02:46.307527+00
286	Dimensional Orb (Immortal) A	Dimensional Orb (Immortal) A	Orb - Lv. 80	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yEC-kLyVgwanDxI/96fx96f	2026-06-27 08:02:46.31637+00
287	Limitless Scepter (Beyond) A	Limitless Scepter (Beyond) A	Scepter - Lv. 65	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OPGVuZeP3yh72a_/96fx96f	2026-06-27 08:02:46.323043+00
288	Iron Crossbow (Arcana) A	Iron Crossbow (Arcana) A	Crossbow - Lv. 30	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCT7hANiaFSfv86g/96fx96f	2026-06-27 08:02:46.329599+00
289	Fighter's Helmet (Immortal) A	Fighter's Helmet (Immortal) A	Helmet - Lv. 65	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0ebcCPhXUXZJcBI/96fx96f	2026-06-27 08:02:46.334863+00
290	Nightshade Extract	Nightshade Extract	Engraving Material	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE8_yUekzqKcHw81kLE0/96fx96f	2026-06-27 08:02:46.341249+00
291	Sapphire Earring (Immortal) A	Sapphire Earring (Immortal) A	Earing - Lv. 50	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0ePcCPhXtEVUvT8/96fx96f	2026-06-27 08:02:46.347066+00
292	Comet Staff (Beyond) A	Comet Staff (Beyond) A	Staff - Lv. 40	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg2fyCFvEJFJCPlA/96fx96f	2026-06-27 08:02:46.351955+00
293	Mystic Gloves (Immortal) A	Mystic Gloves (Immortal) A	Gloves - Lv. 50	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0ePcCPhXYY6Snj8/96fx96f	2026-06-27 08:02:46.358455+00
294	Eclipse Bracer (Legendary) A	Eclipse Bracer (Legendary) A	Bracer - Lv. 65	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0ebcCPhXeU60l4g/96fx96f	2026-06-27 08:02:46.364238+00
295	Dimensional Tome (Immortal) A	Dimensional Tome (Immortal) A	Tome - Lv. 80	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUanzqKcH1KJl9Pc/96fx96f	2026-06-27 08:02:46.369647+00
296	Bronze Ingot	Bronze Ingot	Crafting Material	UNCOMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk9yUehzqKcH9Q6J038/96fx96f	2026-06-27 08:02:46.375462+00
297	Dimensional Hatchet (Arcana) A	Dimensional Hatchet (Arcana) A	Hatchet - Lv. 80	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OPFVuZeP3YtTZMY/96fx96f	2026-06-27 08:02:46.380886+00
298	Stardust Ingot	Stardust Ingot	Crafting Material	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk_yUehzqKcH4B_KzXB/96fx96f	2026-06-27 08:02:46.385918+00
299	Crystal Quartz	Crystal Quartz	Decoration Material	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw_yUehzqKcH-Wb62BD/96fx96f	2026-06-27 08:02:46.39068+00
300	Poisonous Herb	Poisonous Herb	Engraving Material	UNCOMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE89yUejzqKcH04pe3mk/96fx96f	2026-06-27 08:02:46.395931+00
301	Dimensional Axe (Beyond) A	Dimensional Axe (Beyond) A	Axe - Lv. 80	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yEC-kLyVhC-aZko/96fx96f	2026-06-27 08:02:46.400651+00
302	Mandrake Root	Mandrake Root	Engraving Material	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE8_yUejzqKcH3P3ys-X/96fx96f	2026-06-27 08:02:46.406041+00
303	Devout Scepter (Immortal) A	Devout Scepter (Immortal) A	Scepter - Lv. 30	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLFVuZePyB0WdV3/96fx96f	2026-06-27 08:02:46.411673+00
304	Knight Boots (Immortal) A	Knight Boots (Immortal) A	Boots - Lv. 15	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg1PyCFvFVoQ3LPQ/96fx96f	2026-06-27 08:02:46.417106+00
305	Iron Gloves (Immortal) A	Iron Gloves (Immortal) A	Gloves - Lv. 10	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0OHcCPhXg-lhwWg/96fx96f	2026-06-27 08:02:46.425094+00
306	Blessed Tome (Immortal) A	Blessed Tome (Immortal) A	Tome - Lv. 20	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUelzqKcH-zA_Kwc/96fx96f	2026-06-27 08:02:46.43121+00
307	Knight Sword (Immortal) A	Knight Sword (Immortal) A	Sword - Lv. 30	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg1_yCFvFztzlr8A/96fx96f	2026-06-27 08:02:46.438671+00
308	Ancient Orb (Immortal) A	Ancient Orb (Immortal) A	Orb - Lv. 65	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yEO-kLyVTBNejeo/96fx96f	2026-06-27 08:02:46.445005+00
309	Sage Staff (Arcana) A	Sage Staff (Arcana) A	Staff - Lv. 30	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg1_yCFvHRersiOQ/96fx96f	2026-06-27 08:02:46.451575+00
310	Fate Axe (Immortal) A	Fate Axe (Immortal) A	Axe - Lv. 50	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yEa-kLyVCpJ2FBY/96fx96f	2026-06-27 08:02:46.457873+00
311	Platinum Bracer (Legendary) A	Platinum Bracer (Legendary) A	Bracer - Lv. 20	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0OfcCPhXsMcZPhQ/96fx96f	2026-06-27 08:02:46.463725+00
312	Dimensional Crossbow (Immortal) A	Dimensional Crossbow (Immortal) A	Crossbow - Lv. 80	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLDT7hANiZzqnrtag/96fx96f	2026-06-27 08:02:46.46973+00
313	Frozen Orb (Immortal) A	Frozen Orb (Immortal) A	Orb - Lv. 15	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUO-kLyVeM2zigU/96fx96f	2026-06-27 08:02:46.476036+00
314	Rune Plate (Immortal) A	Rune Plate (Immortal) A	Armor - Lv. 40	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg2fyCFvHr7pwHMg/96fx96f	2026-06-27 08:02:46.481844+00
315	Void Staff (Immortal) A	Void Staff (Immortal) A	Staff - Lv. 50	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeh0fyCFvH12Iir3g/96fx96f	2026-06-27 08:02:46.488166+00
316	Knight Helmet (Immortal) A	Knight Helmet (Immortal) A	Helmet - Lv. 15	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0ObcCPhXz6yFpDk/96fx96f	2026-06-27 08:02:46.493372+00
317	Fate Arrow (Immortal) A	Fate Arrow (Immortal) A	Arrow - Lv. 50	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeh0fyCFvHfSA7suw/96fx96f	2026-06-27 08:02:46.499542+00
318	Minor Amethyst	Minor Amethyst	Decoration Material	COMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw8yUelzqKcH25zIZYW/96fx96f	2026-06-27 08:02:46.505197+00
319	Emerald Earring (Legendary) A	Emerald Earring (Legendary) A	Earing - Lv. 30	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0OXcCPhXjPaYdDM/96fx96f	2026-06-27 08:02:46.511137+00
320	Radiant Shield (Beyond) A	Radiant Shield (Beyond) A	Shield - Lv. 65	BEYOND	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0ebcCPhXDAht7Z8/96fx96f	2026-06-27 08:02:46.516901+00
321	Platinum Earring (Arcana) A	Platinum Earring (Arcana) A	Earing - Lv. 20	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0OfcCPhXdb0rqnM/96fx96f	2026-06-27 08:02:46.523218+00
322	Platinum Ring (Arcana) A	Platinum Ring (Arcana) A	Ring - Lv. 20	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUelzqKcH5E5PsGV/96fx96f	2026-06-27 08:02:46.529068+00
323	Azure Staff (Immortal) A	Azure Staff (Immortal) A	Staff - Lv. 20	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg1fyCFvGu9-QAoA/96fx96f	2026-06-27 08:02:46.534121+00
324	Gold Bracer (Immortal) A	Gold Bracer (Immortal) A	Bracer - Lv. 15	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0ObcCPhXBFWmpho/96fx96f	2026-06-27 08:02:46.540379+00
325	Comet Staff (Legendary) A	Comet Staff (Legendary) A	Staff - Lv. 40	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg2fyCFvEJFJCPlA/96fx96f	2026-06-27 08:02:46.546194+00
326	Haste Bolt (Arcana) A	Haste Bolt (Arcana) A	Bolt - Lv. 65	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUakzqKcH_rr98GO/96fx96f	2026-06-27 08:02:46.551283+00
327	Jade Stone	Jade Stone	Decoration Material	UNCOMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw9yUejzqKcHzoNjncj/96fx96f	2026-06-27 08:02:46.558109+00
328	Amethyst Ring (Immortal) A	Amethyst Ring (Immortal) A	Ring - Lv. 40	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUepzqKcH-aAVkoC/96fx96f	2026-06-27 08:02:46.563326+00
329	Platinum Amulet (Arcana) A	Platinum Amulet (Arcana) A	Amulet - Lv. 20	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0OfcCPhXTuz4Iig/96fx96f	2026-06-27 08:02:46.568563+00
330	Iron Tome (Immortal) A	Iron Tome (Immortal) A	Tome - Lv. 10	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUejzqKcHy2-a6KT/96fx96f	2026-06-27 08:02:46.574852+00
331	Prophecy Orb (Immortal) A	Prophecy Orb (Immortal) A	Orb - Lv. 20	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUK-kLyVNlQRhs8/96fx96f	2026-06-27 08:02:46.579054+00
332	Knight's Tome (Arcana) A	Knight's Tome (Arcana) A	Tome - Lv. 15	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUekzqKcH-CR8j1h/96fx96f	2026-06-27 08:02:46.583838+00
333	Gale Arrow (Immortal) A	Gale Arrow (Immortal) A	Arrow - Lv. 30	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg1_yCFvEoAKzcFQ/96fx96f	2026-06-27 08:02:46.589136+00
334	Mystic Boots (Immortal) A	Mystic Boots (Immortal) A	Boots - Lv. 50	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeh0fyCFvFwkcNL8g/96fx96f	2026-06-27 08:02:46.594792+00
335	Heater Shield (Arcana) A	Heater Shield (Arcana) A	Shield - Lv. 15	ARCANA	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0ObcCPhXLNP7nlU/96fx96f	2026-06-27 08:02:46.599505+00
336	Warrior's Tome (Immortal) A	Warrior's Tome (Immortal) A	Tome - Lv. 65	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUakzqKcHwEnwhoR/96fx96f	2026-06-27 08:02:46.604229+00
337	Elite Shield (Arcana) A	Elite Shield (Arcana) A	Shield - Lv. 40	ARCANA	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0OvcCPhXRRriSqY/96fx96f	2026-06-27 08:02:46.609499+00
338	Silver Earring (Immortal) A	Silver Earring (Immortal) A	Earing - Lv. 10	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0OHcCPhXaVO_N0I/96fx96f	2026-06-27 08:02:46.613711+00
339	Ethereal Ring (Legendary) A	Ethereal Ring (Legendary) A	Ring - Lv. 80	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUanzqKcH8JzrIll/96fx96f	2026-06-27 08:02:46.619356+00
340	Barbed Arrow (Immortal) A	Barbed Arrow (Immortal) A	Arrow - Lv. 15	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg1PyCFvHJm9yN-w/96fx96f	2026-06-27 08:02:46.625076+00
341	Topaz	Topaz	Decoration Material	RARE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw-yUejzqKcH_Ra0Nr4/96fx96f	2026-06-27 08:02:46.629796+00
342	Cutlas (Immortal) A	Cutlas (Immortal) A	Sword - Lv. 5	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg0vyCFvEzRUOz3A/96fx96f	2026-06-27 08:02:46.634063+00
343	Dusk Bow (Immortal) A	Dusk Bow (Immortal) A	Bow - Lv. 30	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUC-kLyV4niTZto/96fx96f	2026-06-27 08:02:46.638824+00
344	Minor Ruby	Minor Ruby	Decoration Material	COMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw8yUehzqKcH8X1Pc4b/96fx96f	2026-06-27 08:02:46.64378+00
345	Iron Ingot	Iron Ingot	Crafting Material	UNCOMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk9yUeizqKcHwZM78KK/96fx96f	2026-06-27 08:02:46.648311+00
346	Gold Amulet (Arcana) A	Gold Amulet (Arcana) A	Amulet - Lv. 15	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0ObcCPhXBZDdh6E/96fx96f	2026-06-27 08:02:46.653132+00
347	War Shield (Beyond) A	War Shield (Beyond) A	Shield - Lv. 30	BEYOND	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0OXcCPhXqhPKm2k/96fx96f	2026-06-27 08:02:46.659077+00
348	Dimensional Shield (Immortal) A	Dimensional Shield (Immortal) A	Shield - Lv. 80	IMMORTAL	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0eXcCPhXxWJg0KQ/96fx96f	2026-06-27 08:02:46.663321+00
349	Heavy Shield (Arcana) A	Heavy Shield (Arcana) A	Shield - Lv. 20	ARCANA	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0OfcCPhXmXghbS8/96fx96f	2026-06-27 08:02:46.668136+00
350	Ethereal Amulet (Legendary) A	Ethereal Amulet (Legendary) A	Amulet - Lv. 80	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0eXcCPhXIpdM5WI/96fx96f	2026-06-27 08:02:46.673562+00
351	Brilliant Orb (Immortal) A	Brilliant Orb (Immortal) A	Orb - Lv. 10	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUS-kLyVxJLGmN0/96fx96f	2026-06-27 08:02:46.678781+00
352	Great Sword (Immortal) A	Great Sword (Immortal) A	Sword - Lv. 20	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg1fyCFvGJsiZzxA/96fx96f	2026-06-27 08:02:46.683135+00
353	Azure Arrow (Legendary) A	Azure Arrow (Legendary) A	Arrow - Lv. 20	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg1fyCFvFfpxKh7A/96fx96f	2026-06-27 08:02:46.68886+00
556	Silver Ingot	Silver Ingot	Crafting Material	RARE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk-yUehzqKcH-2mFwsN/96fx96f	2026-06-27 08:02:47.592936+00
354	Emerald Ring (Legendary) A	Emerald Ring (Legendary) A	Ring - Lv. 50	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUahzqKcH4PcE8f0/96fx96f	2026-06-27 08:02:46.693604+00
355	Gold Ring (Immortal) A	Gold Ring (Immortal) A	Ring - Lv. 15	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUekzqKcH20RZFOb/96fx96f	2026-06-27 08:02:46.698957+00
356	Ogre Blood	Ogre Blood	Engraving Material	RARE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE8-yUeizqKcH63tCMOA/96fx96f	2026-06-27 08:02:46.704203+00
357	Gold Amulet (Immortal) A	Gold Amulet (Immortal) A	Amulet - Lv. 15	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0ObcCPhXBZDdh6E/96fx96f	2026-06-27 08:02:46.709467+00
358	Gold Earring (Immortal) A	Gold Earring (Immortal) A	Earing - Lv. 15	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0ObcCPhX6FgWnbU/96fx96f	2026-06-27 08:02:46.715376+00
359	Mystic Bow (Immortal) A	Mystic Bow (Immortal) A	Bow - Lv. 50	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yEa-kLyVU-v7BBI/96fx96f	2026-06-27 08:02:46.720071+00
360	Fate Sword (Immortal) A	Fate Sword (Immortal) A	Sword - Lv. 50	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeh0fyCFvHkGrR9DA/96fx96f	2026-06-27 08:02:46.725511+00
361	Elite Crossbow (Beyond) A	Elite Crossbow (Beyond) A	Crossbow - Lv. 40	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCQbhANiYhXqDbUw/96fx96f	2026-06-27 08:02:46.729569+00
362	Fate Helmet (Immortal) A	Fate Helmet (Immortal) A	Helmet - Lv. 50	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0ePcCPhXeqSDA1w/96fx96f	2026-06-27 08:02:46.735142+00
363	Chain Gloves (Immortal) A	Chain Gloves (Immortal) A	Gloves - Lv. 20	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0OfcCPhXGQ3O2SU/96fx96f	2026-06-27 08:02:46.741255+00
364	Sacred Scepter (Immortal) A	Sacred Scepter (Immortal) A	Scepter - Lv. 20	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLHVuZePy2pWIXu/96fx96f	2026-06-27 08:02:46.747035+00
365	Sapphire	Sapphire	Decoration Material	RARE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw-yUeizqKcHwj4TlzP/96fx96f	2026-06-27 08:02:46.751851+00
366	Rune Boots (Immortal) A	Rune Boots (Immortal) A	Boots - Lv. 40	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg2fyCFvEq2VjeoA/96fx96f	2026-06-27 08:02:46.7583+00
367	War Tome (Immortal) A	War Tome (Immortal) A	Tome - Lv. 30	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUenzqKcH57T8ExQ/96fx96f	2026-06-27 08:02:46.763559+00
368	Ancient Orb (Beyond) A	Ancient Orb (Beyond) A	Orb - Lv. 65	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yEO-kLyVTBNejeo/96fx96f	2026-06-27 08:02:46.767896+00
369	Rune Helmet (Legendary) A	Rune Helmet (Legendary) A	Helmet - Lv. 40	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0OvcCPhXW4qeX9E/96fx96f	2026-06-27 08:02:46.773807+00
370	Radiant Shield (Immortal) A	Radiant Shield (Immortal) A	Shield - Lv. 65	IMMORTAL	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0ebcCPhXDAht7Z8/96fx96f	2026-06-27 08:02:46.779017+00
371	Dimensional Axe (Arcana) A	Dimensional Axe (Arcana) A	Axe - Lv. 80	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yEC-kLyVhC-aZko/96fx96f	2026-06-27 08:02:46.783742+00
372	Silver Earring (Legendary) A	Silver Earring (Legendary) A	Earing - Lv. 10	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0OHcCPhXaVO_N0I/96fx96f	2026-06-27 08:02:46.78904+00
373	Dimensional Helmet (Legendary) A	Dimensional Helmet (Legendary) A	Helmet - Lv. 80	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0eXcCPhXEoKvO14/96fx96f	2026-06-27 08:02:46.793844+00
374	Knight Sword (Beyond) A	Knight Sword (Beyond) A	Sword - Lv. 30	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg1_yCFvFztzlr8A/96fx96f	2026-06-27 08:02:46.79856+00
375	Herald Staff (Immortal) A	Herald Staff (Immortal) A	Staff - Lv. 5	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg0vyCFvFQzXVDUQ/96fx96f	2026-06-27 08:02:46.803274+00
376	Tiger Eye Earring (Legendary) A	Tiger Eye Earring (Legendary) A	Earing - Lv. 40	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0OvcCPhXkF8v7E4/96fx96f	2026-06-27 08:02:46.808027+00
377	Wyvern Claw	Wyvern Claw	Engraving Material	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE84yUeizqKcH7YICqC4/96fx96f	2026-06-27 08:02:46.812286+00
378	Iron Scepter (Immortal) A	Iron Scepter (Immortal) A	Scepter - Lv. 5	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLAVuZeP6Tfz_FN/96fx96f	2026-06-27 08:02:46.816281+00
379	Goblin Hide	Goblin Hide	Engraving Material	COMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE88yUehzqKcH3BSI2ZW/96fx96f	2026-06-27 08:02:46.821023+00
380	Short Bow (Immortal) A	Short Bow (Immortal) A	Bow - Lv. 1	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUa-kLyVRs5qN5w/96fx96f	2026-06-27 08:02:46.824642+00
381	Fate Bolt (Arcana) A	Fate Bolt (Arcana) A	Bolt - Lv. 50	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUahzqKcH07_h8kw/96fx96f	2026-06-27 08:02:46.829663+00
382	Exceptional Crossbow (Arcana) A	Exceptional Crossbow (Arcana) A	Crossbow - Lv. 20	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCTbhANia6az2Ugg/96fx96f	2026-06-27 08:02:46.833939+00
383	Obsidian Bracer (Legendary) A	Obsidian Bracer (Legendary) A	Bracer - Lv. 30	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0OXcCPhXfiUZCNU/96fx96f	2026-06-27 08:02:46.838124+00
384	Limitless Bow (Legendary) A	Limitless Bow (Legendary) A	Bow - Lv. 65	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yEO-kLyVszpW2hw/96fx96f	2026-06-27 08:02:46.842386+00
385	War Boots (Immortal) A	War Boots (Immortal) A	Boots - Lv. 30	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg1_yCFvECe6wQxQ/96fx96f	2026-06-27 08:02:46.846527+00
386	Silver Bracer (Immortal) A	Silver Bracer (Immortal) A	Bracer - Lv. 10	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0OHcCPhXclT9oI0/96fx96f	2026-06-27 08:02:46.850238+00
387	Gold Ring (Legendary) A	Gold Ring (Legendary) A	Ring - Lv. 15	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUekzqKcH20RZFOb/96fx96f	2026-06-27 08:02:46.854415+00
388	War Shield (Arcana) A	War Shield (Arcana) A	Shield - Lv. 30	ARCANA	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0OXcCPhXqhPKm2k/96fx96f	2026-06-27 08:02:46.858104+00
389	Wooden Helmet (Immortal) A	Wooden Helmet (Immortal) A	Helmet - Lv. 1	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0OPcCPhXRduPEjo/96fx96f	2026-06-27 08:02:46.862784+00
390	Rune Arrow (Immortal) A	Rune Arrow (Immortal) A	Arrow - Lv. 40	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg2fyCFvFmQa68uw/96fx96f	2026-06-27 08:02:46.867504+00
391	Knight's Tome (Immortal) A	Knight's Tome (Immortal) A	Tome - Lv. 15	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUekzqKcH-CR8j1h/96fx96f	2026-06-27 08:02:46.871723+00
392	Celestial Earring (Legendary) A	Celestial Earring (Legendary) A	Earing - Lv. 65	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0ebcCPhXqWAXTyY/96fx96f	2026-06-27 08:02:46.875912+00
393	Healing Herb	Healing Herb	Engraving Material	UNCOMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE89yUekzqKcHxk82PZ5/96fx96f	2026-06-27 08:02:46.879714+00
394	Amber Ring (Legendary) A	Amber Ring (Legendary) A	Ring - Lv. 30	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUenzqKcH1K5IKZS/96fx96f	2026-06-27 08:02:46.883867+00
395	Elite Shield (Immortal) A	Elite Shield (Immortal) A	Shield - Lv. 40	IMMORTAL	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0OvcCPhXRRriSqY/96fx96f	2026-06-27 08:02:46.887539+00
396	War Gloves (Immortal) A	War Gloves (Immortal) A	Gloves - Lv. 30	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0OXcCPhX96Wmmc4/96fx96f	2026-06-27 08:02:46.891725+00
397	Empire Helmet (Immortal) A	Empire Helmet (Immortal) A	Helmet - Lv. 5	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0ODcCPhXh8WbJyQ/96fx96f	2026-06-27 08:02:46.895939+00
398	Silver Amulet (Legendary) A	Silver Amulet (Legendary) A	Amulet - Lv. 10	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0OHcCPhXHPkUH5g/96fx96f	2026-06-27 08:02:46.899632+00
399	Shine Boots (Immortal) A	Shine Boots (Immortal) A	Boots - Lv. 65	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeh1PyCFvE_jfhnkA/96fx96f	2026-06-27 08:02:46.903867+00
400	Limitless Crossbow (Immortal) A	Limitless Crossbow (Immortal) A	Crossbow - Lv. 65	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLDTLhANiYel3xWxw/96fx96f	2026-06-27 08:02:46.908741+00
401	Arcane Orb (Immortal) A	Arcane Orb (Immortal) A	Orb - Lv. 40	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yU6-kLyV74qLg9Q/96fx96f	2026-06-27 08:02:46.912939+00
402	Tempest Staff (Legendary) A	Tempest Staff (Legendary) A	Staff - Lv. 80	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeh1_yCFvFAIV78oQ/96fx96f	2026-06-27 08:02:46.916607+00
403	Beast Bolt (Immortal) A	Beast Bolt (Immortal) A	Bolt - Lv. 20	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUelzqKcHwaOvJtl/96fx96f	2026-06-27 08:02:46.920837+00
404	Emerald Bracer (Legendary) A	Emerald Bracer (Legendary) A	Bracer - Lv. 50	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0ePcCPhXWrmmDA4/96fx96f	2026-06-27 08:02:46.925591+00
405	Fate Tome (Immortal) A	Fate Tome (Immortal) A	Tome - Lv. 50	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUahzqKcH5qU-uNa/96fx96f	2026-06-27 08:02:46.928755+00
406	Limitless Scepter (Legendary) A	Limitless Scepter (Legendary) A	Scepter - Lv. 65	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OPGVuZeP3yh72a_/96fx96f	2026-06-27 08:02:46.932417+00
407	Eclipse Amulet (Legendary) A	Eclipse Amulet (Legendary) A	Amulet - Lv. 65	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0ebcCPhXEU4z_xU/96fx96f	2026-06-27 08:02:46.936611+00
408	Empire Boots (Immortal) A	Empire Boots (Immortal) A	Boots - Lv. 5	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg0vyCFvFCbY0Siw/96fx96f	2026-06-27 08:02:46.943614+00
409	Blessed Tome (Legendary) A	Blessed Tome (Legendary) A	Tome - Lv. 20	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUelzqKcH-zA_Kwc/96fx96f	2026-06-27 08:02:46.949449+00
410	Mystic Orb (Immortal) A	Mystic Orb (Immortal) A	Orb - Lv. 50	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yEa-kLyVub0IWyA/96fx96f	2026-06-27 08:02:46.955188+00
411	Silver Ring (Legendary) A	Silver Ring (Legendary) A	Ring - Lv. 10	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUejzqKcH8o0-3tp/96fx96f	2026-06-27 08:02:46.96388+00
412	Bronze Ring (Immortal) A	Bronze Ring (Immortal) A	Ring - Lv. 5	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUeizqKcH76bbP1R/96fx96f	2026-06-27 08:02:46.971046+00
413	Wooden Staff (Immortal) A	Wooden Staff (Immortal) A	Staff - Lv. 1	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg0fyCFvGCzjwbjg/96fx96f	2026-06-27 08:02:46.979499+00
414	Gold Bracer (Arcana) A	Gold Bracer (Arcana) A	Bracer - Lv. 15	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0ObcCPhXBFWmpho/96fx96f	2026-06-27 08:02:46.986071+00
415	Sacred Staff (Legendary) A	Sacred Staff (Legendary) A	Staff - Lv. 65	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeh1PyCFvG8eqj7kg/96fx96f	2026-06-27 08:02:46.99251+00
416	Heater Shield (Immortal) A	Heater Shield (Immortal) A	Shield - Lv. 15	IMMORTAL	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0ObcCPhXLNP7nlU/96fx96f	2026-06-27 08:02:46.997758+00
417	Gold Amulet (Legendary) A	Gold Amulet (Legendary) A	Amulet - Lv. 15	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0ObcCPhXBZDdh6E/96fx96f	2026-06-27 08:02:47.002574+00
418	Bronze Bracer (Legendary) A	Bronze Bracer (Legendary) A	Bracer - Lv. 5	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0ODcCPhXgbFgpu8/96fx96f	2026-06-27 08:02:47.008912+00
419	Mystic Crossbow (Arcana) A	Mystic Crossbow (Arcana) A	Crossbow - Lv. 50	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLDSbhANibYAwBASA/96fx96f	2026-06-27 08:02:47.01517+00
420	Dimensional Armor (Legendary) A	Dimensional Armor (Legendary) A	Armor - Lv. 80	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeh1_yCFvGlogEy6A/96fx96f	2026-06-27 08:02:47.022191+00
421	Rune Bolt (Arcana) A	Rune Bolt (Arcana) A	Bolt - Lv. 40	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUepzqKcHz33g1HY/96fx96f	2026-06-27 08:02:47.027971+00
422	War Shield (Immortal) A	War Shield (Immortal) A	Shield - Lv. 30	IMMORTAL	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0OXcCPhXqhPKm2k/96fx96f	2026-06-27 08:02:47.032305+00
423	Barbed Arrow (Legendary) A	Barbed Arrow (Legendary) A	Arrow - Lv. 15	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg1PyCFvHJm9yN-w/96fx96f	2026-06-27 08:02:47.036969+00
424	Limitless Axe (Arcana) A	Limitless Axe (Arcana) A	Axe - Lv. 65	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yEO-kLyV1Jo8p5c/96fx96f	2026-06-27 08:02:47.042001+00
425	Haste Arrow (Legendary) A	Haste Arrow (Legendary) A	Arrow - Lv. 65	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeh1PyCFvFwJGSIxg/96fx96f	2026-06-27 08:02:47.046157+00
426	Exceptional Crossbow (Immortal) A	Exceptional Crossbow (Immortal) A	Crossbow - Lv. 20	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCTbhANia6az2Ugg/96fx96f	2026-06-27 08:02:47.050398+00
427	Hunting Bow (Immortal) A	Hunting Bow (Immortal) A	Bow - Lv. 5	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUW-kLyVaEBOz84/96fx96f	2026-06-27 08:02:47.054116+00
428	Amethyst Ring (Legendary) A	Amethyst Ring (Legendary) A	Ring - Lv. 40	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUepzqKcH-aAVkoC/96fx96f	2026-06-27 08:02:47.058575+00
429	Mystic Shield (Beyond) A	Mystic Shield (Beyond) A	Shield - Lv. 50	BEYOND	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0ePcCPhXXlwYl6o/96fx96f	2026-06-27 08:02:47.063351+00
430	Dimensional Bolt (Immortal) A	Dimensional Bolt (Immortal) A	Bolt - Lv. 80	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUanzqKcH0krde5M/96fx96f	2026-06-27 08:02:47.067006+00
431	Bronze Amulet (Legendary) A	Bronze Amulet (Legendary) A	Amulet - Lv. 5	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0ODcCPhXltzM3Rc/96fx96f	2026-06-27 08:02:47.071173+00
432	Gold Earring (Legendary) A	Gold Earring (Legendary) A	Earing - Lv. 15	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0ObcCPhX6FgWnbU/96fx96f	2026-06-27 08:02:47.07588+00
433	Empire Armor (Immortal) A	Empire Armor (Immortal) A	Armor - Lv. 5	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg0vyCFvEB4Str1A/96fx96f	2026-06-27 08:02:47.080089+00
434	Eclipse Ring (Legendary) A	Eclipse Ring (Legendary) A	Ring - Lv. 65	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUakzqKcH-yZJgVT/96fx96f	2026-06-27 08:02:47.083763+00
435	Mystic Shield (Immortal) A	Mystic Shield (Immortal) A	Shield - Lv. 50	IMMORTAL	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0ePcCPhXXlwYl6o/96fx96f	2026-06-27 08:02:47.087466+00
436	Fate Arrow (Legendary) A	Fate Arrow (Legendary) A	Arrow - Lv. 50	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeh0fyCFvHfSA7suw/96fx96f	2026-06-27 08:02:47.092729+00
437	Bat Wing Membrane	Bat Wing Membrane	Engraving Material	RARE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE8-yUehzqKcH7WRrVMn/96fx96f	2026-06-27 08:02:47.097018+00
438	Rune Axe (Arcana) A	Rune Axe (Arcana) A	Axe - Lv. 40	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yU6-kLyVBkY_8Tc/96fx96f	2026-06-27 08:02:47.100661+00
439	Iron Bolt (Immortal) A	Iron Bolt (Immortal) A	Bolt - Lv. 30	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUenzqKcH_Bxa_RF/96fx96f	2026-06-27 08:02:47.10611+00
440	Gold Bracer (Legendary) A	Gold Bracer (Legendary) A	Bracer - Lv. 15	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0ObcCPhXBFWmpho/96fx96f	2026-06-27 08:02:47.111379+00
441	Knight Helmet (Legendary) A	Knight Helmet (Legendary) A	Helmet - Lv. 15	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0ObcCPhXz6yFpDk/96fx96f	2026-06-27 08:02:47.115655+00
442	Shine Gloves (Legendary) A	Shine Gloves (Legendary) A	Gloves - Lv. 65	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0ebcCPhXx04wyoo/96fx96f	2026-06-27 08:02:47.119881+00
443	Bronze Earring (Legendary) A	Bronze Earring (Legendary) A	Earing - Lv. 5	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0ODcCPhXbJz3x8E/96fx96f	2026-06-27 08:02:47.124676+00
444	Elite Shield (Beyond) A	Elite Shield (Beyond) A	Shield - Lv. 40	BEYOND	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0OvcCPhXRRriSqY/96fx96f	2026-06-27 08:02:47.128825+00
445	Dimensional Orb (Legendary) A	Dimensional Orb (Legendary) A	Orb - Lv. 80	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yEC-kLyVgwanDxI/96fx96f	2026-06-27 08:02:47.132503+00
446	Iron Boots (Legendary) A	Iron Boots (Legendary) A	Boots - Lv. 10	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg0_yCFvHI2ln9rA/96fx96f	2026-06-27 08:02:47.136179+00
447	Elite Crossbow (Arcana) A	Elite Crossbow (Arcana) A	Crossbow - Lv. 40	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCQbhANiYhXqDbUw/96fx96f	2026-06-27 08:02:47.141477+00
448	Knight Gloves (Legendary) A	Knight Gloves (Legendary) A	Gloves - Lv. 15	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0ObcCPhXzqQSg_4/96fx96f	2026-06-27 08:02:47.145761+00
449	Crimson Bracer (Legendary) A	Crimson Bracer (Legendary) A	Bracer - Lv. 40	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0OvcCPhXsCuXqDA/96fx96f	2026-06-27 08:02:47.150481+00
450	Heater Shield (Legendary) A	Heater Shield (Legendary) A	Shield - Lv. 15	LEGENDARY	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0ObcCPhXLNP7nlU/96fx96f	2026-06-27 08:02:47.159652+00
451	Empire Gloves (Immortal) A	Empire Gloves (Immortal) A	Gloves - Lv. 5	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0ODcCPhX30JmLzI/96fx96f	2026-06-27 08:02:47.16655+00
452	Sapphire Earring (Legendary) A	Sapphire Earring (Legendary) A	Earing - Lv. 50	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0ePcCPhXtEVUvT8/96fx96f	2026-06-27 08:02:47.171416+00
453	Wooden Shield (Immortal) A	Wooden Shield (Immortal) A	Shield - Lv. 5	IMMORTAL	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0ODcCPhXDrJ3Jbk/96fx96f	2026-06-27 08:02:47.17561+00
454	Dimensional Gloves (Legendary) A	Dimensional Gloves (Legendary) A	Gloves - Lv. 80	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0eXcCPhX0F0RKKg/96fx96f	2026-06-27 08:02:47.179845+00
455	Vengeance Sword (Legendary) A	Vengeance Sword (Legendary) A	Sword - Lv. 65	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeh1PyCFvFjfF0I7w/96fx96f	2026-06-27 08:02:47.184606+00
456	Hunter's Arrow (Legendary) A	Hunter's Arrow (Legendary) A	Arrow - Lv. 10	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg0_yCFvHIS02ZUQ/96fx96f	2026-06-27 08:02:47.190502+00
457	Ancient Tree Sap	Ancient Tree Sap	Engraving Material	RARE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE8-yUekzqKcH2dPS41m/96fx96f	2026-06-27 08:02:47.197364+00
458	Wood	Wood	Crafting Material	COMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk8yUehzqKcH8g_E54J/96fx96f	2026-06-27 08:02:47.20316+00
459	Long Bow (Legendary) A	Long Bow (Legendary) A	Bow - Lv. 10	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUS-kLyVQRqvOk4/96fx96f	2026-06-27 08:02:47.207916+00
460	Dimensional Scepter (Legendary) A	Dimensional Scepter (Legendary) A	Scepter - Lv. 80	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OPFVuZePwJ6ZpJ6/96fx96f	2026-06-27 08:02:47.212548+00
461	Silver Bracer (Legendary) A	Silver Bracer (Legendary) A	Bracer - Lv. 10	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0OHcCPhXclT9oI0/96fx96f	2026-06-27 08:02:47.216852+00
462	Dimensional Boots (Legendary) A	Dimensional Boots (Legendary) A	Boots - Lv. 80	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeh1_yCFvEB3bNr4w/96fx96f	2026-06-27 08:02:47.220442+00
463	Witch Staff (Legendary) A	Witch Staff (Legendary) A	Staff - Lv. 15	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg1PyCFvHlezTlDg/96fx96f	2026-06-27 08:02:47.224632+00
464	Dimensional Crossbow (Legendary) A	Dimensional Crossbow (Legendary) A	Crossbow - Lv. 80	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLDT7hANiZzqnrtag/96fx96f	2026-06-27 08:02:47.228296+00
465	Knight Boots (Legendary) A	Knight Boots (Legendary) A	Boots - Lv. 15	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg1PyCFvFVoQ3LPQ/96fx96f	2026-06-27 08:02:47.231984+00
466	Prophecy Orb (Legendary) A	Prophecy Orb (Legendary) A	Orb - Lv. 20	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUK-kLyVNlQRhs8/96fx96f	2026-06-27 08:02:47.237234+00
467	Long Crossbow (Immortal) A	Long Crossbow (Immortal) A	Crossbow - Lv. 10	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCS7hANiaqn4OXJg/96fx96f	2026-06-27 08:02:47.240379+00
468	Gale Arrow (Legendary) A	Gale Arrow (Legendary) A	Arrow - Lv. 30	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg1_yCFvEoAKzcFQ/96fx96f	2026-06-27 08:02:47.245077+00
469	Fighter's Helmet (Legendary) A	Fighter's Helmet (Legendary) A	Helmet - Lv. 65	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0ebcCPhXUXZJcBI/96fx96f	2026-06-27 08:02:47.249007+00
470	Iron Gloves (Legendary) A	Iron Gloves (Legendary) A	Gloves - Lv. 10	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0OHcCPhXg-lhwWg/96fx96f	2026-06-27 08:02:47.252141+00
471	Rune Orb (Immortal) A	Rune Orb (Immortal) A	Orb - Lv. 30	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUC-kLyV2eT-7fM/96fx96f	2026-06-27 08:02:47.255743+00
472	Rune Tome (Immortal) A	Rune Tome (Immortal) A	Tome - Lv. 40	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUepzqKcHw2Z9icR/96fx96f	2026-06-27 08:02:47.260162+00
473	Heavy Shield (Immortal) A	Heavy Shield (Immortal) A	Shield - Lv. 20	IMMORTAL	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0OfcCPhXmXghbS8/96fx96f	2026-06-27 08:02:47.26435+00
474	Mystic Bow (Legendary) A	Mystic Bow (Legendary) A	Bow - Lv. 50	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yEa-kLyVU-v7BBI/96fx96f	2026-06-27 08:02:47.268005+00
475	Dimensional Tome (Legendary) A	Dimensional Tome (Legendary) A	Tome - Lv. 80	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUanzqKcH1KJl9Pc/96fx96f	2026-06-27 08:02:47.271143+00
476	Chain Gloves (Legendary) A	Chain Gloves (Legendary) A	Gloves - Lv. 20	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0OfcCPhXGQ3O2SU/96fx96f	2026-06-27 08:02:47.275276+00
477	Haste Bolt (Immortal) A	Haste Bolt (Immortal) A	Bolt - Lv. 65	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUakzqKcH_rr98GO/96fx96f	2026-06-27 08:02:47.27906+00
478	Rune Orb (Legendary) A	Rune Orb (Legendary) A	Orb - Lv. 30	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUC-kLyV2eT-7fM/96fx96f	2026-06-27 08:02:47.284515+00
479	Knight's Tome (Legendary) A	Knight's Tome (Legendary) A	Tome - Lv. 15	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUekzqKcH-CR8j1h/96fx96f	2026-06-27 08:02:47.288167+00
480	Iron Arrow (Legendary) A	Iron Arrow (Legendary) A	Arrow - Lv. 5	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg0vyCFvEkaTEnvg/96fx96f	2026-06-27 08:02:47.291286+00
481	War Bow (Legendary) A	War Bow (Legendary) A	Bow - Lv. 20	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUK-kLyVKbrfk38/96fx96f	2026-06-27 08:02:47.29603+00
482	Chain Boots (Legendary) A	Chain Boots (Legendary) A	Boots - Lv. 20	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg1fyCFvEubPTQCg/96fx96f	2026-06-27 08:02:47.300215+00
483	Gold Ingot	Gold Ingot	Crafting Material	RARE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk-yUeizqKcHzLFc8Bf/96fx96f	2026-06-27 08:02:47.304397+00
484	Arcane Orb (Legendary) A	Arcane Orb (Legendary) A	Orb - Lv. 40	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yU6-kLyV74qLg9Q/96fx96f	2026-06-27 08:02:47.309691+00
485	Knight's Armor (Legendary) A	Knight's Armor (Legendary) A	Armor - Lv. 20	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg1fyCFvETj4jKdQ/96fx96f	2026-06-27 08:02:47.315643+00
486	Iron Shield (Immortal) A	Iron Shield (Immortal) A	Shield - Lv. 10	IMMORTAL	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0OHcCPhXtuxcoyU/96fx96f	2026-06-27 08:02:47.320102+00
487	Empire Gloves (Legendary) A	Empire Gloves (Legendary) A	Gloves - Lv. 5	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0ODcCPhX30JmLzI/96fx96f	2026-06-27 08:02:47.323703+00
488	Chain Helmet (Legendary) A	Chain Helmet (Legendary) A	Helmet - Lv. 20	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0OfcCPhX8fKtIQA/96fx96f	2026-06-27 08:02:47.328459+00
489	Rune Plate (Legendary) A	Rune Plate (Legendary) A	Armor - Lv. 40	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg2fyCFvHr7pwHMg/96fx96f	2026-06-27 08:02:47.332638+00
490	Iron Plate (Legendary) A	Iron Plate (Legendary) A	Armor - Lv. 10	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg0_yCFvGgq5PtrA/96fx96f	2026-06-27 08:02:47.336297+00
491	Dimensional Hatchet (Immortal) A	Dimensional Hatchet (Immortal) A	Hatchet - Lv. 80	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OPFVuZeP3YtTZMY/96fx96f	2026-06-27 08:02:47.340005+00
492	Iron Tome (Legendary) A	Iron Tome (Legendary) A	Tome - Lv. 10	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUejzqKcHy2-a6KT/96fx96f	2026-06-27 08:02:47.344702+00
493	Frozen Orb (Legendary) A	Frozen Orb (Legendary) A	Orb - Lv. 15	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUO-kLyVeM2zigU/96fx96f	2026-06-27 08:02:47.348369+00
494	Fate Sword (Legendary) A	Fate Sword (Legendary) A	Sword - Lv. 50	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeh0fyCFvHkGrR9DA/96fx96f	2026-06-27 08:02:47.352021+00
495	Skeleton Bone	Skeleton Bone	Engraving Material	COMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE88yUeizqKcH-mix536/96fx96f	2026-06-27 08:02:47.356262+00
496	Empire Armor (Legendary) A	Empire Armor (Legendary) A	Armor - Lv. 5	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg0vyCFvEB4Str1A/96fx96f	2026-06-27 08:02:47.35996+00
497	Mushroom Spore	Mushroom Spore	Engraving Material	RARE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE8-yUejzqKcH25W-dcP/96fx96f	2026-06-27 08:02:47.364719+00
498	Fate Bolt (Immortal) A	Fate Bolt (Immortal) A	Bolt - Lv. 50	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUahzqKcH07_h8kw/96fx96f	2026-06-27 08:02:47.368273+00
499	Long Crossbow (Legendary) A	Long Crossbow (Legendary) A	Crossbow - Lv. 10	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCS7hANiaqn4OXJg/96fx96f	2026-06-27 08:02:47.371978+00
500	Bronze Ring (Legendary) A	Bronze Ring (Legendary) A	Ring - Lv. 5	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUeizqKcH76bbP1R/96fx96f	2026-06-27 08:02:47.376691+00
501	Empire Helmet (Legendary) A	Empire Helmet (Legendary) A	Helmet - Lv. 5	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0ODcCPhXh8WbJyQ/96fx96f	2026-06-27 08:02:47.380625+00
502	Dimensional Shield (Legendary) A	Dimensional Shield (Legendary) A	Shield - Lv. 80	LEGENDARY	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0eXcCPhXxWJg0KQ/96fx96f	2026-06-27 08:02:47.384263+00
503	Copper Earring (Immortal) A	Copper Earring (Immortal) A	Earing - Lv. 1	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0OPcCPhXDF489ZM/96fx96f	2026-06-27 08:02:47.388073+00
504	Blessed Scepter (Legendary) A	Blessed Scepter (Legendary) A	Scepter - Lv. 10	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLBVuZeP82585JP/96fx96f	2026-06-27 08:02:47.392831+00
505	Azure Staff (Legendary) A	Azure Staff (Legendary) A	Staff - Lv. 20	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg1fyCFvGu9-QAoA/96fx96f	2026-06-27 08:02:47.397025+00
506	Hunting Bow (Legendary) A	Hunting Bow (Legendary) A	Bow - Lv. 5	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUW-kLyVaEBOz84/96fx96f	2026-06-27 08:02:47.400843+00
507	Mystic Armor (Legendary) A	Mystic Armor (Legendary) A	Armor - Lv. 50	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeh0fyCFvFAiQmlUA/96fx96f	2026-06-27 08:02:47.404521+00
508	Fate Helmet (Legendary) A	Fate Helmet (Legendary) A	Helmet - Lv. 50	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0ePcCPhXeqSDA1w/96fx96f	2026-06-27 08:02:47.408647+00
509	Herald Staff (Legendary) A	Herald Staff (Legendary) A	Staff - Lv. 5	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg0vyCFvFQzXVDUQ/96fx96f	2026-06-27 08:02:47.413372+00
510	Copper Ring (Immortal) A	Copper Ring (Immortal) A	Ring - Lv. 1	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUehzqKcHzBrLbcK/96fx96f	2026-06-27 08:02:47.417604+00
511	Iron Helmet (Legendary) A	Iron Helmet (Legendary) A	Helmet - Lv. 10	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0OHcCPhXUubWbDw/96fx96f	2026-06-27 08:02:47.420717+00
512	Rune Bolt (Immortal) A	Rune Bolt (Immortal) A	Bolt - Lv. 40	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUepzqKcHz33g1HY/96fx96f	2026-06-27 08:02:47.424424+00
513	Warrior's Tome (Legendary) A	Warrior's Tome (Legendary) A	Tome - Lv. 65	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUakzqKcHwEnwhoR/96fx96f	2026-06-27 08:02:47.428092+00
514	Shine Boots (Legendary) A	Shine Boots (Legendary) A	Boots - Lv. 65	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeh1PyCFvE_jfhnkA/96fx96f	2026-06-27 08:02:47.43192+00
515	Composite Bow (Legendary) A	Composite Bow (Legendary) A	Bow - Lv. 15	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUO-kLyVm2WtmGs/96fx96f	2026-06-27 08:02:47.435488+00
516	Dusk Bow (Legendary) A	Dusk Bow (Legendary) A	Bow - Lv. 30	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUC-kLyV4niTZto/96fx96f	2026-06-27 08:02:47.439222+00
517	Dimensional Axe (Immortal) A	Dimensional Axe (Immortal) A	Axe - Lv. 80	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yEC-kLyVhC-aZko/96fx96f	2026-06-27 08:02:47.442363+00
518	Brilliant Orb (Legendary) A	Brilliant Orb (Legendary) A	Orb - Lv. 10	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUS-kLyVxJLGmN0/96fx96f	2026-06-27 08:02:47.446044+00
519	Empire Boots (Legendary) A	Empire Boots (Legendary) A	Boots - Lv. 5	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg0vyCFvFCbY0Siw/96fx96f	2026-06-27 08:02:47.449707+00
520	Elite Crossbow (Immortal) A	Elite Crossbow (Immortal) A	Crossbow - Lv. 40	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCQbhANiYhXqDbUw/96fx96f	2026-06-27 08:02:47.45336+00
521	Shine Armor (Legendary) A	Shine Armor (Legendary) A	Armor - Lv. 65	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeh1PyCFvGccMCVew/96fx96f	2026-06-27 08:02:47.456483+00
522	Elite Hatchet (Immortal) A	Elite Hatchet (Immortal) A	Hatchet - Lv. 40	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLLVuZeP8O2LxFC/96fx96f	2026-06-27 08:02:47.460352+00
523	Limitless Axe (Immortal) A	Limitless Axe (Immortal) A	Axe - Lv. 65	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yEO-kLyV1Jo8p5c/96fx96f	2026-06-27 08:02:47.464022+00
524	Minor Sapphire	Minor Sapphire	Decoration Material	COMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw8yUeizqKcH3jdtwGa/96fx96f	2026-06-27 08:02:47.467681+00
525	Iron Shield (Legendary) A	Iron Shield (Legendary) A	Shield - Lv. 10	LEGENDARY	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0OHcCPhXtuxcoyU/96fx96f	2026-06-27 08:02:47.471354+00
526	War Tome (Legendary) A	War Tome (Legendary) A	Tome - Lv. 30	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUenzqKcH57T8ExQ/96fx96f	2026-06-27 08:02:47.474983+00
527	Rune Sword (Legendary) A	Rune Sword (Legendary) A	Sword - Lv. 40	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg2fyCFvEdOMjfnQ/96fx96f	2026-06-27 08:02:47.482431+00
528	Devout Scepter (Legendary) A	Devout Scepter (Legendary) A	Scepter - Lv. 30	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLFVuZePyB0WdV3/96fx96f	2026-06-27 08:02:47.487258+00
529	Chain Mail (Legendary) A	Chain Mail (Legendary) A	Armor - Lv. 15	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg1PyCFvFBvEhIBw/96fx96f	2026-06-27 08:02:47.490651+00
530	Sacred Scepter (Legendary) A	Sacred Scepter (Legendary) A	Scepter - Lv. 20	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLHVuZePy2pWIXu/96fx96f	2026-06-27 08:02:47.49541+00
531	Complete Crossbow (Legendary) A	Complete Crossbow (Legendary) A	Crossbow - Lv. 15	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCTLhANiYHZSuChQ/96fx96f	2026-06-27 08:02:47.499118+00
532	Radiant Shield (Legendary) A	Radiant Shield (Legendary) A	Shield - Lv. 65	LEGENDARY	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0ebcCPhXDAht7Z8/96fx96f	2026-06-27 08:02:47.502782+00
533	War Gloves (Legendary) A	War Gloves (Legendary) A	Gloves - Lv. 30	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0OXcCPhX96Wmmc4/96fx96f	2026-06-27 08:02:47.506423+00
534	Haste Bolt (Legendary) A	Haste Bolt (Legendary) A	Bolt - Lv. 65	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUakzqKcH_rr98GO/96fx96f	2026-06-27 08:02:47.511349+00
535	Rune Gloves (Legendary) A	Rune Gloves (Legendary) A	Gloves - Lv. 40	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0OvcCPhXyYYLRhY/96fx96f	2026-06-27 08:02:47.515038+00
536	Rapier (Legendary) A	Rapier (Legendary) A	Sword - Lv. 10	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg0_yCFvGwgSQrvQ/96fx96f	2026-06-27 08:02:47.518155+00
537	Rune Scepter (Legendary) A	Rune Scepter (Legendary) A	Scepter - Lv. 40	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLLVuZeP5zZxr6M/96fx96f	2026-06-27 08:02:47.521839+00
538	Heavy Shield (Legendary) A	Heavy Shield (Legendary) A	Shield - Lv. 20	LEGENDARY	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0OfcCPhXmXghbS8/96fx96f	2026-06-27 08:02:47.526366+00
539	Fate Tome (Legendary) A	Fate Tome (Legendary) A	Tome - Lv. 50	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUahzqKcH5qU-uNa/96fx96f	2026-06-27 08:02:47.529895+00
540	Ancient Orb (Legendary) A	Ancient Orb (Legendary) A	Orb - Lv. 65	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yEO-kLyVTBNejeo/96fx96f	2026-06-27 08:02:47.533931+00
541	Void Staff (Legendary) A	Void Staff (Legendary) A	Staff - Lv. 50	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeh0fyCFvH12Iir3g/96fx96f	2026-06-27 08:02:47.537615+00
542	Mystic Crossbow (Immortal) A	Mystic Crossbow (Immortal) A	Crossbow - Lv. 50	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLDSbhANibYAwBASA/96fx96f	2026-06-27 08:02:47.541601+00
543	Mystic Hatchet (Immortal) A	Mystic Hatchet (Immortal) A	Hatchet - Lv. 50	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OPDVuZePxlyrL23/96fx96f	2026-06-27 08:02:47.545248+00
544	Elite Bow (Legendary) A	Elite Bow (Legendary) A	Bow - Lv. 40	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yU6-kLyVAAf7yE0/96fx96f	2026-06-27 08:02:47.548894+00
545	Great Sword (Legendary) A	Great Sword (Legendary) A	Sword - Lv. 20	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg1fyCFvGJsiZzxA/96fx96f	2026-06-27 08:02:47.552608+00
546	Mystic Gloves (Legendary) A	Mystic Gloves (Legendary) A	Gloves - Lv. 50	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0ePcCPhXYY6Snj8/96fx96f	2026-06-27 08:02:47.556249+00
547	Elite Shield (Legendary) A	Elite Shield (Legendary) A	Shield - Lv. 40	LEGENDARY	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0OvcCPhXRRriSqY/96fx96f	2026-06-27 08:02:47.560452+00
548	Steel Scepter (Legendary) A	Steel Scepter (Legendary) A	Scepter - Lv. 15	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLGVuZePz9BcabE/96fx96f	2026-06-27 08:02:47.564279+00
549	Iron Scepter (Legendary) A	Iron Scepter (Legendary) A	Scepter - Lv. 5	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLAVuZeP6Tfz_FN/96fx96f	2026-06-27 08:02:47.567416+00
550	Mystic Boots (Legendary) A	Mystic Boots (Legendary) A	Boots - Lv. 50	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeh0fyCFvFwkcNL8g/96fx96f	2026-06-27 08:02:47.571131+00
551	Mystic Shield (Legendary) A	Mystic Shield (Legendary) A	Shield - Lv. 50	LEGENDARY	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0ePcCPhXXlwYl6o/96fx96f	2026-06-27 08:02:47.574231+00
552	War Armor (Legendary) A	War Armor (Legendary) A	Armor - Lv. 30	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg1_yCFvFPcJMXJw/96fx96f	2026-06-27 08:02:47.577896+00
553	Knight Sword (Legendary) A	Knight Sword (Legendary) A	Sword - Lv. 30	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg1_yCFvFztzlr8A/96fx96f	2026-06-27 08:02:47.581955+00
554	Bastard Sword (Legendary) A	Bastard Sword (Legendary) A	Sword - Lv. 15	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg1PyCFvEcxA7LDg/96fx96f	2026-06-27 08:02:47.585649+00
555	Rune Tome (Legendary) A	Rune Tome (Legendary) A	Tome - Lv. 40	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUepzqKcHw2Z9icR/96fx96f	2026-06-27 08:02:47.588771+00
557	Mystic Orb (Legendary) A	Mystic Orb (Legendary) A	Orb - Lv. 50	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yEa-kLyVub0IWyA/96fx96f	2026-06-27 08:02:47.596587+00
558	Rune Arrow (Legendary) A	Rune Arrow (Legendary) A	Arrow - Lv. 40	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg2fyCFvFmQa68uw/96fx96f	2026-06-27 08:02:47.600329+00
559	Bronze Earring (Immortal) A	Bronze Earring (Immortal) A	Earing - Lv. 5	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0ODcCPhXbJz3x8E/96fx96f	2026-06-27 08:02:47.603467+00
560	Fate Sword (Beyond) A	Fate Sword (Beyond) A	Sword - Lv. 50	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeh0fyCFvHkGrR9DA/96fx96f	2026-06-27 08:02:47.606598+00
561	Leather Crossbow (Immortal) A	Leather Crossbow (Immortal) A	Crossbow - Lv. 5	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCSrhANia7_Y7sVA/96fx96f	2026-06-27 08:02:47.610819+00
562	Barbed Bolt (Legendary) A	Barbed Bolt (Legendary) A	Bolt - Lv. 15	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUekzqKcH9foyV-o/96fx96f	2026-06-27 08:02:47.614502+00
563	Bronze Bracer (Immortal) A	Bronze Bracer (Immortal) A	Bracer - Lv. 5	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0ODcCPhXgbFgpu8/96fx96f	2026-06-27 08:02:47.618702+00
564	Slime Jelly	Slime Jelly	Engraving Material	COMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE88yUejzqKcH-bZ6kdS/96fx96f	2026-06-27 08:02:47.621843+00
565	Rune Boots (Legendary) A	Rune Boots (Legendary) A	Boots - Lv. 40	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg2fyCFvEq2VjeoA/96fx96f	2026-06-27 08:02:47.625799+00
566	Wolf Fang	Wolf Fang	Engraving Material	UNCOMMON	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTE89yUehzqKcH5e444t4/96fx96f	2026-06-27 08:02:47.629537+00
567	Sage Staff (Legendary) A	Sage Staff (Legendary) A	Staff - Lv. 30	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg1_yCFvHRersiOQ/96fx96f	2026-06-27 08:02:47.633702+00
568	Rune Bolt (Beyond) A	Rune Bolt (Beyond) A	Bolt - Lv. 40	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUepzqKcHz33g1HY/96fx96f	2026-06-27 08:02:47.637359+00
569	Wooden Arrow (Immortal) A	Wooden Arrow (Immortal) A	Arrow - Lv. 1	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg0fyCFvETwHvEHQ/96fx96f	2026-06-27 08:02:47.6405+00
570	Iron Crossbow (Immortal) A	Iron Crossbow (Immortal) A	Crossbow - Lv. 30	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCT7hANiaFSfv86g/96fx96f	2026-06-27 08:02:47.644701+00
571	Emerald Ring (Beyond) A	Emerald Ring (Beyond) A	Ring - Lv. 50	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUahzqKcH4PcE8f0/96fx96f	2026-06-27 08:02:47.647825+00
572	Ethereal Bracer (Beyond) A	Ethereal Bracer (Beyond) A	Bracer - Lv. 80	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0eXcCPhX8JAhIZU/96fx96f	2026-06-27 08:02:47.651483+00
573	Hunter's Bolt (Legendary) A	Hunter's Bolt (Legendary) A	Bolt - Lv. 10	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUejzqKcH4JYbOrI/96fx96f	2026-06-27 08:02:47.655108+00
574	Gold Ring (Arcana) A	Gold Ring (Arcana) A	Ring - Lv. 15	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUekzqKcH20RZFOb/96fx96f	2026-06-27 08:02:47.658733+00
575	Mystic Crossbow (Beyond) A	Mystic Crossbow (Beyond) A	Crossbow - Lv. 50	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLDSbhANibYAwBASA/96fx96f	2026-06-27 08:02:47.662455+00
576	Long Sword (Legendary) A	Long Sword (Legendary) A	Sword - Lv. 1	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg0fyCFvGTqOEUqg/96fx96f	2026-06-27 08:02:47.66616+00
577	Cutlas (Legendary) A	Cutlas (Legendary) A	Sword - Lv. 5	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg0vyCFvEzRUOz3A/96fx96f	2026-06-27 08:02:47.669858+00
578	Ethereal Earring (Beyond) A	Ethereal Earring (Beyond) A	Earing - Lv. 80	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0eXcCPhXpZNNrJY/96fx96f	2026-06-27 08:02:47.673499+00
579	Leather Gloves (Legendary) A	Leather Gloves (Legendary) A	Gloves - Lv. 1	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0OPcCPhXg2wWg_Y/96fx96f	2026-06-27 08:02:47.677382+00
580	Novice Scepter (Immortal) A	Novice Scepter (Immortal) A	Scepter - Lv. 1	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLDVuZeP6RxPIf_/96fx96f	2026-06-27 08:02:47.681047+00
581	Elder Orb (Legendary) A	Elder Orb (Legendary) A	Orb - Lv. 5	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUW-kLyVJfNBrjc/96fx96f	2026-06-27 08:02:47.684858+00
582	Iron Crossbow (Legendary) A	Iron Crossbow (Legendary) A	Crossbow - Lv. 30	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCT7hANiaFSfv86g/96fx96f	2026-06-27 08:02:47.687998+00
583	Ethereal Ring (Beyond) A	Ethereal Ring (Beyond) A	Ring - Lv. 80	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUanzqKcH8JzrIll/96fx96f	2026-06-27 08:02:47.691732+00
584	Eclipse Ring (Beyond) A	Eclipse Ring (Beyond) A	Ring - Lv. 65	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUakzqKcH-yZJgVT/96fx96f	2026-06-27 08:02:47.695878+00
585	Ruby Pendant (Beyond) A	Ruby Pendant (Beyond) A	Amulet - Lv. 40	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0OvcCPhX0moUmfY/96fx96f	2026-06-27 08:02:47.699538+00
586	Iron Crossbow (Beyond) A	Iron Crossbow (Beyond) A	Crossbow - Lv. 30	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCT7hANiaFSfv86g/96fx96f	2026-06-27 08:02:47.703344+00
587	Complete Crossbow (Arcana) A	Complete Crossbow (Arcana) A	Crossbow - Lv. 15	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCTLhANiYHZSuChQ/96fx96f	2026-06-27 08:02:47.706582+00
588	Dimensional Hatchet (Beyond) A	Dimensional Hatchet (Beyond) A	Hatchet - Lv. 80	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OPFVuZeP3YtTZMY/96fx96f	2026-06-27 08:02:47.710264+00
589	Copper Earring (Legendary) A	Copper Earring (Legendary) A	Earing - Lv. 1	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0OPcCPhXDF489ZM/96fx96f	2026-06-27 08:02:47.71392+00
590	Hunter's Bolt (Immortal) A	Hunter's Bolt (Immortal) A	Bolt - Lv. 10	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUejzqKcH4JYbOrI/96fx96f	2026-06-27 08:02:47.717068+00
591	Rune Axe (Immortal) A	Rune Axe (Immortal) A	Axe - Lv. 40	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yU6-kLyVBkY_8Tc/96fx96f	2026-06-27 08:02:47.72073+00
592	Steel Axe (Arcana) A	Steel Axe (Arcana) A	Axe - Lv. 15	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUO-kLyVWdqGWPc/96fx96f	2026-06-27 08:02:47.723914+00
593	Complete Crossbow (Immortal) A	Complete Crossbow (Immortal) A	Crossbow - Lv. 15	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCTLhANiYHZSuChQ/96fx96f	2026-06-27 08:02:47.728569+00
594	War Axe (Immortal) A	War Axe (Immortal) A	Axe - Lv. 20	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUK-kLyVpZQqWZM/96fx96f	2026-06-27 08:02:47.731689+00
595	Sapphire Earring (Beyond) A	Sapphire Earring (Beyond) A	Earing - Lv. 50	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0ePcCPhXtEVUvT8/96fx96f	2026-06-27 08:02:47.735363+00
596	Limitless Hatchet (Beyond) A	Limitless Hatchet (Beyond) A	Hatchet - Lv. 65	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OPGVuZePy5vzk9s/96fx96f	2026-06-27 08:02:47.738547+00
597	Crimson Bracer (Beyond) A	Crimson Bracer (Beyond) A	Bracer - Lv. 40	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0OvcCPhXsCuXqDA/96fx96f	2026-06-27 08:02:47.742194+00
598	Eclipse Amulet (Beyond) A	Eclipse Amulet (Beyond) A	Amulet - Lv. 65	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0ebcCPhXEU4z_xU/96fx96f	2026-06-27 08:02:47.745853+00
599	Amber Ring (Beyond) A	Amber Ring (Beyond) A	Ring - Lv. 30	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUenzqKcH1K5IKZS/96fx96f	2026-06-27 08:02:47.74955+00
600	Elite Hatchet (Arcana) A	Elite Hatchet (Arcana) A	Hatchet - Lv. 40	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLLVuZeP8O2LxFC/96fx96f	2026-06-27 08:02:47.752719+00
601	Great Axe (Immortal) A	Great Axe (Immortal) A	Axe - Lv. 30	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUC-kLyV_U1pl8Y/96fx96f	2026-06-27 08:02:47.75643+00
602	Beast Bolt (Legendary) A	Beast Bolt (Legendary) A	Bolt - Lv. 20	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUelzqKcHwaOvJtl/96fx96f	2026-06-27 08:02:47.759558+00
603	Copper Bracer (Legendary) A	Copper Bracer (Legendary) A	Bracer - Lv. 1	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0OPcCPhX1grcWCY/96fx96f	2026-06-27 08:02:47.763219+00
604	Limitless Crossbow (Legendary) A	Limitless Crossbow (Legendary) A	Crossbow - Lv. 65	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLDTLhANiYel3xWxw/96fx96f	2026-06-27 08:02:47.766351+00
605	Fate Scepter (Legendary) A	Fate Scepter (Legendary) A	Scepter - Lv. 50	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OPDVuZeP5tUN1fA/96fx96f	2026-06-27 08:02:47.76955+00
606	Prayer Tome (Legendary) A	Prayer Tome (Legendary) A	Tome - Lv. 1	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUehzqKcH5JcB5dM/96fx96f	2026-06-27 08:02:47.772662+00
607	Battle Axe (Immortal) A	Battle Axe (Immortal) A	Axe - Lv. 10	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUS-kLyVOsK1TWw/96fx96f	2026-06-27 08:02:47.777448+00
608	Iron Arrow (Immortal) A	Iron Arrow (Immortal) A	Arrow - Lv. 5	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg0vyCFvEkaTEnvg/96fx96f	2026-06-27 08:02:47.78061+00
609	Long Sword (Immortal) A	Long Sword (Immortal) A	Sword - Lv. 1	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeg0fyCFvGTqOEUqg/96fx96f	2026-06-27 08:02:47.784287+00
610	Haste Arrow (Beyond) A	Haste Arrow (Beyond) A	Arrow - Lv. 65	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeh1PyCFvFwJGSIxg/96fx96f	2026-06-27 08:02:47.787972+00
611	Copper Amulet (Legendary) A	Copper Amulet (Legendary) A	Amulet - Lv. 1	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0OPcCPhXUOX_t9M/96fx96f	2026-06-27 08:02:47.791627+00
612	Iron Axe (Legendary) A	Iron Axe (Legendary) A	Axe - Lv. 5	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUW-kLyVYg1DJIo/96fx96f	2026-06-27 08:02:47.795838+00
613	Empire Tome (Legendary) A	Empire Tome (Legendary) A	Tome - Lv. 5	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUeizqKcHw9phSLp/96fx96f	2026-06-27 08:02:47.79958+00
614	Wooden Boots (Legendary) A	Wooden Boots (Legendary) A	Boots - Lv. 1	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg0fyCFvFJsI2YzQ/96fx96f	2026-06-27 08:02:47.803301+00
615	Short Bow (Legendary) A	Short Bow (Legendary) A	Bow - Lv. 1	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUa-kLyVRs5qN5w/96fx96f	2026-06-27 08:02:47.806452+00
616	Wooden Helmet (Legendary) A	Wooden Helmet (Legendary) A	Helmet - Lv. 1	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0OPcCPhXRduPEjo/96fx96f	2026-06-27 08:02:47.811949+00
617	Copper Bracer (Immortal) A	Copper Bracer (Immortal) A	Bracer - Lv. 1	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0OPcCPhX1grcWCY/96fx96f	2026-06-27 08:02:47.817543+00
618	War Helmet (Legendary) A	War Helmet (Legendary) A	Helmet - Lv. 30	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0OXcCPhXY1Y7hD4/96fx96f	2026-06-27 08:02:47.822113+00
619	Prayer Tome (Immortal) A	Prayer Tome (Immortal) A	Tome - Lv. 1	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUehzqKcH5JcB5dM/96fx96f	2026-06-27 08:02:47.828999+00
620	Bronze Amulet (Immortal) A	Bronze Amulet (Immortal) A	Amulet - Lv. 5	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0ODcCPhXltzM3Rc/96fx96f	2026-06-27 08:02:47.835546+00
621	Ethereal Amulet (Beyond) A	Ethereal Amulet (Beyond) A	Amulet - Lv. 80	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0eXcCPhXIpdM5WI/96fx96f	2026-06-27 08:02:47.840814+00
622	Limitless Hatchet (Immortal) A	Limitless Hatchet (Immortal) A	Hatchet - Lv. 65	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OPGVuZePy5vzk9s/96fx96f	2026-06-27 08:02:47.847796+00
623	Wooden Staff (Legendary) A	Wooden Staff (Legendary) A	Staff - Lv. 1	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeg0fyCFvGCzjwbjg/96fx96f	2026-06-27 08:02:47.852494+00
624	Novice Scepter (Legendary) A	Novice Scepter (Legendary) A	Scepter - Lv. 1	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlOQMBBOC9TykSg0OLDVuZeP6RxPIf_/96fx96f	2026-06-27 08:02:47.857204+00
625	Great Axe (Arcana) A	Great Axe (Arcana) A	Axe - Lv. 30	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUC-kLyV_U1pl8Y/96fx96f	2026-06-27 08:02:47.862496+00
626	Elite Crossbow (Legendary) A	Elite Crossbow (Legendary) A	Crossbow - Lv. 40	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCQbhANiYhXqDbUw/96fx96f	2026-06-27 08:02:47.866735+00
627	War Shield (Legendary) A	War Shield (Legendary) A	Shield - Lv. 30	LEGENDARY	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0OXcCPhXqhPKm2k/96fx96f	2026-06-27 08:02:47.870943+00
628	Short Bolt (Immortal) A	Short Bolt (Immortal) A	Bolt - Lv. 1	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUehzqKcH6zIh5Ww/96fx96f	2026-06-27 08:02:47.877281+00
629	Mystic Hatchet (Arcana) A	Mystic Hatchet (Arcana) A	Hatchet - Lv. 50	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OPDVuZePxlyrL23/96fx96f	2026-06-27 08:02:47.883047+00
630	Buckler (Legendary) A	Buckler (Legendary) A	Shield - Lv. 1	LEGENDARY	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0OPcCPhX08xXlbQ/96fx96f	2026-06-27 08:02:47.888418+00
631	Wooden Armor (Legendary) A	Wooden Armor (Legendary) A	Armor - Lv. 1	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeg0fyCFvFGGUuVGA/96fx96f	2026-06-27 08:02:47.892249+00
632	War Hatchet (Legendary) A	War Hatchet (Legendary) A	Hatchet - Lv. 20	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLHVuZePw3NqPxk/96fx96f	2026-06-27 08:02:47.898312+00
633	Haste Bolt (Beyond) A	Haste Bolt (Beyond) A	Bolt - Lv. 65	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUakzqKcH_rr98GO/96fx96f	2026-06-27 08:02:47.903532+00
634	Copper Ring (Legendary) A	Copper Ring (Legendary) A	Ring - Lv. 1	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJhES9dKS088yUehzqKcHzBrLbcK/96fx96f	2026-06-27 08:02:47.908487+00
635	Long Hatchet (Immortal) A	Long Hatchet (Immortal) A	Hatchet - Lv. 10	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLBVuZeP9fXxPEd/96fx96f	2026-06-27 08:02:47.913673+00
636	Emerald Amulet (Beyond) A	Emerald Amulet (Beyond) A	Amulet - Lv. 50	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0ePcCPhXepQTZ0Y/96fx96f	2026-06-27 08:02:47.918445+00
637	Obsidian Bracer (Beyond) A	Obsidian Bracer (Beyond) A	Bracer - Lv. 30	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0OXcCPhXfiUZCNU/96fx96f	2026-06-27 08:02:47.923305+00
638	Battle Hatchet (Arcana) A	Battle Hatchet (Arcana) A	Hatchet - Lv. 30	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLFVuZeP30rP9t9/96fx96f	2026-06-27 08:02:47.928275+00
639	Fate Bolt (Legendary) A	Fate Bolt (Legendary) A	Bolt - Lv. 50	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUahzqKcH07_h8kw/96fx96f	2026-06-27 08:02:47.932454+00
640	Gold Earring (Arcana) A	Gold Earring (Arcana) A	Earing - Lv. 15	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0ObcCPhX6FgWnbU/96fx96f	2026-06-27 08:02:47.936645+00
641	Dimensional Bolt (Legendary) A	Dimensional Bolt (Legendary) A	Bolt - Lv. 80	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUanzqKcH0krde5M/96fx96f	2026-06-27 08:02:47.940342+00
642	Short Crossbow (Immortal) A	Short Crossbow (Immortal) A	Crossbow - Lv. 1	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCSbhANibbMyKndg/96fx96f	2026-06-27 08:02:47.945045+00
643	Rune Bolt (Legendary) A	Rune Bolt (Legendary) A	Bolt - Lv. 40	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUepzqKcHz33g1HY/96fx96f	2026-06-27 08:02:47.949254+00
644	Great Axe (Legendary) A	Great Axe (Legendary) A	Axe - Lv. 30	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUC-kLyV_U1pl8Y/96fx96f	2026-06-27 08:02:47.953069+00
645	Mystic Crossbow (Legendary) A	Mystic Crossbow (Legendary) A	Crossbow - Lv. 50	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLDSbhANibYAwBASA/96fx96f	2026-06-27 08:02:47.956659+00
646	Empire Tome (Immortal) A	Empire Tome (Immortal) A	Tome - Lv. 5	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUeizqKcHw9phSLp/96fx96f	2026-06-27 08:02:47.960931+00
647	Barbed Bolt (Immortal) A	Barbed Bolt (Immortal) A	Bolt - Lv. 15	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUekzqKcH9foyV-o/96fx96f	2026-06-27 08:02:47.965249+00
648	Dimensional Bolt (Beyond) A	Dimensional Bolt (Beyond) A	Bolt - Lv. 80	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUanzqKcH0krde5M/96fx96f	2026-06-27 08:02:47.968999+00
649	Rune Axe (Beyond) A	Rune Axe (Beyond) A	Axe - Lv. 40	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yU6-kLyVBkY_8Tc/96fx96f	2026-06-27 08:02:47.972643+00
650	War Boots (Legendary) A	War Boots (Legendary) A	Boots - Lv. 30	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg1_yCFvECe6wQxQ/96fx96f	2026-06-27 08:02:47.97684+00
651	Mystic Hatchet (Legendary) A	Mystic Hatchet (Legendary) A	Hatchet - Lv. 50	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OPDVuZePxlyrL23/96fx96f	2026-06-27 08:02:47.981035+00
652	Mystic Hatchet (Beyond) A	Mystic Hatchet (Beyond) A	Hatchet - Lv. 50	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OPDVuZePxlyrL23/96fx96f	2026-06-27 08:02:47.985781+00
653	Fighter's Helmet (Cosmic) A	Fighter's Helmet (Cosmic) A	Helmet - Lv. 65	EPIC	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0ebcCPhXUXZJcBI/96fx96f	2026-06-27 08:02:47.989923+00
654	Sacred Staff (Celestial) A	Sacred Staff (Celestial) A	Staff - Lv. 65	UNIQUE	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlZRNZTIk4-yUeh1PyCFvG8eqj7kg/96fx96f	2026-06-27 08:02:47.994664+00
655	Radiant Shield (Divine) A	Radiant Shield (Divine) A	Shield - Lv. 65	UNIQUE	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0ebcCPhXDAht7Z8/96fx96f	2026-06-27 08:02:47.999447+00
656	Celestial Pearl	Celestial Pearl	Decoration Material	UNIQUE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEw7yUehzqKcHyzWDWRq/96fx96f	2026-06-27 08:02:48.004113+00
657	Sunstone	Sunstone	Crafting Material	UNIQUE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk7yUeizqKcHwoXLTs0/96fx96f	2026-06-27 08:02:48.009374+00
658	Dimensional Gloves (Celestial) A	Dimensional Gloves (Celestial) A	Gloves - Lv. 80	UNIQUE	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI1BSsZQLiI5y0eg0eXcCPhX0F0RKKg/96fx96f	2026-06-27 08:02:48.017139+00
659	Moonstone	Moonstone	Crafting Material	UNIQUE	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEk7yUehzqKcH8-0390m/96fx96f	2026-06-27 08:02:48.022473+00
660	Dimensional Shield (Celestial) A	Dimensional Shield (Celestial) A	Shield - Lv. 80	UNIQUE	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0eXcCPhXxWJg0KQ/96fx96f	2026-06-27 08:02:48.027208+00
661	Shine Boots (Celestial) A	Shine Boots (Celestial) A	Boots - Lv. 65	UNIQUE	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeh1PyCFvE_jfhnkA/96fx96f	2026-06-27 08:02:48.033022+00
662	Dimensional Arrow (Celestial) A	Dimensional Arrow (Celestial) A	Arrow - Lv. 80	UNIQUE	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeh1_yCFvEI_SUA1w/96fx96f	2026-06-27 08:02:48.038307+00
663	Dimensional Armor (Divine) A	Dimensional Armor (Divine) A	Armor - Lv. 80	UNIQUE	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeh1_yCFvGlogEy6A/96fx96f	2026-06-27 08:02:48.041964+00
664	Beast Bolt (Arcana) A	Beast Bolt (Arcana) A	Bolt - Lv. 20	ARCANA	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUelzqKcHwaOvJtl/96fx96f	2026-06-27 08:02:48.046696+00
665	Battle Hatchet (Beyond) A	Battle Hatchet (Beyond) A	Hatchet - Lv. 30	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLFVuZeP30rP9t9/96fx96f	2026-06-27 08:02:48.050343+00
666	Iron Bolt (Beyond) A	Iron Bolt (Beyond) A	Bolt - Lv. 30	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUenzqKcH_Bxa_RF/96fx96f	2026-06-27 08:02:48.054542+00
667	Fear Bolt (Immortal) A	Fear Bolt (Immortal) A	Bolt - Lv. 5	IMMORTAL	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUeizqKcH5JC0pZz/96fx96f	2026-06-27 08:02:48.058168+00
668	Steel Axe (Legendary) A	Steel Axe (Legendary) A	Axe - Lv. 15	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUO-kLyVWdqGWPc/96fx96f	2026-06-27 08:02:48.062902+00
669	Great Axe (Beyond) A	Great Axe (Beyond) A	Axe - Lv. 30	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUC-kLyV_U1pl8Y/96fx96f	2026-06-27 08:02:48.067112+00
670	Long Hatchet (Legendary) A	Long Hatchet (Legendary) A	Hatchet - Lv. 10	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLBVuZeP9fXxPEd/96fx96f	2026-06-27 08:02:48.070791+00
671	Short Crossbow (Legendary) A	Short Crossbow (Legendary) A	Crossbow - Lv. 1	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCSbhANibbMyKndg/96fx96f	2026-06-27 08:02:48.076159+00
672	Elite Hatchet (Beyond) A	Elite Hatchet (Beyond) A	Hatchet - Lv. 40	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLLVuZeP8O2LxFC/96fx96f	2026-06-27 08:02:48.080384+00
673	Short Hatchet (Legendary) A	Short Hatchet (Legendary) A	Hatchet - Lv. 1	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLDVuZePw8qeAjT/96fx96f	2026-06-27 08:02:48.084586+00
674	Wooden Axe (Immortal) A	Wooden Axe (Immortal) A	Axe - Lv. 1	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUa-kLyVicUxvnw/96fx96f	2026-06-27 08:02:48.088258+00
675	Battle Axe (Legendary) A	Battle Axe (Legendary) A	Axe - Lv. 10	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUS-kLyVOsK1TWw/96fx96f	2026-06-27 08:02:48.092428+00
676	Leather Crossbow (Legendary) A	Leather Crossbow (Legendary) A	Crossbow - Lv. 5	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCSrhANia7_Y7sVA/96fx96f	2026-06-27 08:02:48.097144+00
677	Short Hatchet (Immortal) A	Short Hatchet (Immortal) A	Hatchet - Lv. 1	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLDVuZePw8qeAjT/96fx96f	2026-06-27 08:02:48.102171+00
678	Elite Hatchet (Legendary) A	Elite Hatchet (Legendary) A	Hatchet - Lv. 40	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLLVuZeP8O2LxFC/96fx96f	2026-06-27 08:02:48.105878+00
679	Fate Tome (Beyond) A	Fate Tome (Beyond) A	Tome - Lv. 50	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUahzqKcH5qU-uNa/96fx96f	2026-06-27 08:02:48.111102+00
680	Emerald Bracer (Beyond) A	Emerald Bracer (Beyond) A	Bracer - Lv. 50	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0ePcCPhXWrmmDA4/96fx96f	2026-06-27 08:02:48.115822+00
681	War Hatchet (Arcana) A	War Hatchet (Arcana) A	Hatchet - Lv. 20	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLHVuZePw3NqPxk/96fx96f	2026-06-27 08:02:48.120129+00
682	Short Bolt (Legendary) A	Short Bolt (Legendary) A	Bolt - Lv. 1	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUehzqKcH6zIh5Ww/96fx96f	2026-06-27 08:02:48.123765+00
683	Wooden Axe (Legendary) A	Wooden Axe (Legendary) A	Axe - Lv. 1	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUa-kLyVicUxvnw/96fx96f	2026-06-27 08:02:48.128516+00
684	Limitless Hatchet (Legendary) A	Limitless Hatchet (Legendary) A	Hatchet - Lv. 65	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OPGVuZePy5vzk9s/96fx96f	2026-06-27 08:02:48.131641+00
685	Fate Bolt (Beyond) A	Fate Bolt (Beyond) A	Bolt - Lv. 50	BEYOND	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUahzqKcH07_h8kw/96fx96f	2026-06-27 08:02:48.135335+00
686	Steel Hatchet (Legendary) A	Steel Hatchet (Legendary) A	Hatchet - Lv. 15	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLGVuZePyh5PLPM/96fx96f	2026-06-27 08:02:48.13911+00
687	Moonstone Pendant (Beyond) A	Moonstone Pendant (Beyond) A	Amulet - Lv. 30	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0OXcCPhX8iMu0ic/96fx96f	2026-06-27 08:02:48.142867+00
688	Limitless Hatchet (Arcana) A	Limitless Hatchet (Arcana) A	Hatchet - Lv. 65	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OPGVuZePy5vzk9s/96fx96f	2026-06-27 08:02:48.146542+00
689	Iron Axe (Immortal) A	Iron Axe (Immortal) A	Axe - Lv. 5	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUW-kLyVYg1DJIo/96fx96f	2026-06-27 08:02:48.149686+00
690	Copper Amulet (Immortal) A	Copper Amulet (Immortal) A	Amulet - Lv. 1	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0OPcCPhXUOX_t9M/96fx96f	2026-06-27 08:02:48.153492+00
691	Steel Hatchet (Immortal) A	Steel Hatchet (Immortal) A	Hatchet - Lv. 15	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLGVuZePyh5PLPM/96fx96f	2026-06-27 08:02:48.159153+00
692	Eclipse Bracer (Beyond) A	Eclipse Bracer (Beyond) A	Bracer - Lv. 65	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0ebcCPhXeU60l4g/96fx96f	2026-06-27 08:02:48.162834+00
693	Emerald Bracer (Arcana) A	Emerald Bracer (Arcana) A	Bracer - Lv. 50	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0ePcCPhXWrmmDA4/96fx96f	2026-06-27 08:02:48.167076+00
694	Exceptional Crossbow (Legendary) A	Exceptional Crossbow (Legendary) A	Crossbow - Lv. 20	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLCTbhANia6az2Ugg/96fx96f	2026-06-27 08:02:48.17072+00
695	War Axe (Legendary) A	War Axe (Legendary) A	Axe - Lv. 20	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUK-kLyVpZQqWZM/96fx96f	2026-06-27 08:02:48.178698+00
696	Steel Axe (Immortal) A	Steel Axe (Immortal) A	Axe - Lv. 15	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUO-kLyVWdqGWPc/96fx96f	2026-06-27 08:02:48.182442+00
697	Limitless Crossbow (Beyond) A	Limitless Crossbow (Beyond) A	Crossbow - Lv. 65	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLDTLhANiYel3xWxw/96fx96f	2026-06-27 08:02:48.186145+00
698	Fate Axe (Legendary) A	Fate Axe (Legendary) A	Axe - Lv. 50	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yEa-kLyVCpJ2FBY/96fx96f	2026-06-27 08:02:48.189289+00
699	Limitless Axe (Legendary) A	Limitless Axe (Legendary) A	Axe - Lv. 65	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yEO-kLyV1Jo8p5c/96fx96f	2026-06-27 08:02:48.192951+00
700	Fate Axe (Arcana) A	Fate Axe (Arcana) A	Axe - Lv. 50	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yEa-kLyVCpJ2FBY/96fx96f	2026-06-27 08:02:48.19718+00
701	Iron Bolt (Legendary) A	Iron Bolt (Legendary) A	Bolt - Lv. 30	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUenzqKcH_Bxa_RF/96fx96f	2026-06-27 08:02:48.201592+00
702	Eclipse Amulet (Arcana) A	Eclipse Amulet (Arcana) A	Amulet - Lv. 65	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0ebcCPhXEU4z_xU/96fx96f	2026-06-27 08:02:48.206085+00
703	Kingdom 100th Anniversary Coin	Kingdom 100th Anniversary Coin	Offering Material	BEYOND	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIN5YP1KTEs8yUenzqKcH9zug9qT/96fx96f	2026-06-27 08:02:48.209565+00
704	Ruby Pendant (Immortal) A	Ruby Pendant (Immortal) A	Amulet - Lv. 40	IMMORTAL	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0OvcCPhX0moUmfY/96fx96f	2026-06-27 08:02:48.213758+00
705	Dimensional Hatchet (Legendary) A	Dimensional Hatchet (Legendary) A	Hatchet - Lv. 80	LEGENDARY	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OPFVuZeP3YtTZMY/96fx96f	2026-06-27 08:02:48.217427+00
706	War Tome (Beyond) A	War Tome (Beyond) A	Tome - Lv. 30	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUenzqKcH57T8ExQ/96fx96f	2026-06-27 08:02:48.22054+00
707	Eclipse Bracer (Arcana) A	Eclipse Bracer (Arcana) A	Bracer - Lv. 65	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0ebcCPhXeU60l4g/96fx96f	2026-06-27 08:02:48.224249+00
708	Magic Orb (Immortal) A	Magic Orb (Immortal) A	Orb - Lv. 1	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUa-kLyVbq_ifFU/96fx96f	2026-06-27 08:02:48.228554+00
709	Mystic Boots (Beyond) A	Mystic Boots (Beyond) A	Boots - Lv. 50	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeh0fyCFvFwkcNL8g/96fx96f	2026-06-27 08:02:48.231938+00
710	Battle Hatchet (Immortal) A	Battle Hatchet (Immortal) A	Hatchet - Lv. 30	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLFVuZeP30rP9t9/96fx96f	2026-06-27 08:02:48.235117+00
711	Elder Orb (Immortal) A	Elder Orb (Immortal) A	Orb - Lv. 5	IMMORTAL	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUW-kLyVJfNBrjc/96fx96f	2026-06-27 08:02:48.238786+00
712	Dimensional Axe (Legendary) A	Dimensional Axe (Legendary) A	Axe - Lv. 80	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yEC-kLyVhC-aZko/96fx96f	2026-06-27 08:02:48.241936+00
713	Ethereal Bracer (Arcana) A	Ethereal Bracer (Arcana) A	Bracer - Lv. 80	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhfRNNQLyI6ykeg0eXcCPhX8JAhIZU/96fx96f	2026-06-27 08:02:48.246692+00
714	Celestial Earring (Arcana) A	Celestial Earring (Arcana) A	Earing - Lv. 65	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0ebcCPhXqWAXTyY/96fx96f	2026-06-27 08:02:48.250342+00
715	Limitless Crossbow (Arcana) A	Limitless Crossbow (Arcana) A	Crossbow - Lv. 65	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIlfSsNGPzJbpkSk0OLDTLhANiYel3xWxw/96fx96f	2026-06-27 08:02:48.253459+00
716	Mystic Armor (Beyond) A	Mystic Armor (Beyond) A	Armor - Lv. 50	BEYOND	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfSN9HIkg9yUeh0fyCFvFAiQmlUA/96fx96f	2026-06-27 08:02:48.257021+00
717	Dimensional Helmet (Arcana) A	Dimensional Helmet (Arcana) A	Helmet - Lv. 80	ARCANA	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJISd1QKSI5yUeg0eXcCPhXEoKvO14/96fx96f	2026-06-27 08:02:48.261297+00
718	Wooden Shield (Legendary) A	Wooden Shield (Legendary) A	Shield - Lv. 5	LEGENDARY	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0ODcCPhXDrJ3Jbk/96fx96f	2026-06-27 08:02:48.264981+00
719	Magic Orb (Legendary) A	Magic Orb (Legendary) A	Orb - Lv. 1	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yUa-kLyVbq_ifFU/96fx96f	2026-06-27 08:02:48.268616+00
720	Buckler (Immortal) A	Buckler (Immortal) A	Shield - Lv. 1	IMMORTAL	Off-hands	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlFTNVZOSI4yUeg0OPcCPhX08xXlbQ/96fx96f	2026-06-27 08:02:48.271762+00
721	Mystic Orb (Beyond) A	Mystic Orb (Beyond) A	Orb - Lv. 50	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIVfR88hT008yEa-kLyVub0IWyA/96fx96f	2026-06-27 08:02:48.277052+00
722	Tiger Eye Earring (Arcana) A	Tiger Eye Earring (Arcana) A	Earing - Lv. 40	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0OvcCPhXkF8v7E4/96fx96f	2026-06-27 08:02:48.280175+00
723	Ruby Pendant (Arcana) A	Ruby Pendant (Arcana) A	Amulet - Lv. 40	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItAUNxQKSI6yUeg0OvcCPhX0moUmfY/96fx96f	2026-06-27 08:02:48.283853+00
724	War Hatchet (Immortal) A	War Hatchet (Immortal) A	Hatchet - Lv. 20	IMMORTAL	Armor	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIJMUdNdOClTzUKg0OLHVuZePw3NqPxk/96fx96f	2026-06-27 08:02:48.286995+00
725	War Axe (Arcana) A	War Axe (Arcana) A	Axe - Lv. 20	ARCANA	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yUK-kLyVpZQqWZM/96fx96f	2026-06-27 08:02:48.29017+00
726	Limitless Axe (Beyond) A	Limitless Axe (Beyond) A	Axe - Lv. 65	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItVQM8mSE08yEO-kLyV1Jo8p5c/96fx96f	2026-06-27 08:02:48.294382+00
727	Fear Bolt (Legendary) A	Fear Bolt (Legendary) A	Bolt - Lv. 5	LEGENDARY	Other	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCScRKSUk8yUeizqKcH5JC0pZz/96fx96f	2026-06-27 08:02:48.298151+00
728	Rune Tome (Beyond) A	Rune Tome (Beyond) A	Tome - Lv. 40	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJ5CSNVKSU48yUepzqKcHw2Z9icR/96fx96f	2026-06-27 08:02:48.301293+00
729	Vengeance Sword (Beyond) A	Vengeance Sword (Beyond) A	Sword - Lv. 65	BEYOND	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsJlaSsJRIk48yUeh1PyCFvFjfF0I7w/96fx96f	2026-06-27 08:02:48.304481+00
730	Ethereal Earring (Arcana) A	Ethereal Earring (Arcana) A	Earing - Lv. 80	ARCANA	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0eXcCPhXpZNNrJY/96fx96f	2026-06-27 08:02:48.308164+00
731	Wooden Arrow (Legendary) A	Wooden Arrow (Legendary) A	Arrow - Lv. 1	LEGENDARY	Weapons	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsItfV99CIkk9yUeg0fyCFvETwHvEHQ/96fx96f	2026-06-27 08:02:48.311827+00
732	Ethereal Earring (Legendary) A	Ethereal Earring (Legendary) A	Earing - Lv. 80	LEGENDARY	Accessories	https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsI9MV9lbOiI6yEeg0eXcCPhXpZNNrJY/96fx96f	2026-06-27 08:02:48.315497+00
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, alert_id, master_item_id, message, triggered_price_idr, triggered_price_usd, target_value, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: price_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_alerts (id, user_id, master_item_id, alert_type, currency, target_value, direction, is_active, triggered_at, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_history (id, master_item_id, lowest_price_idr, median_price_idr, lowest_price_usd, median_price_usd, volume, fetch_status, fetched_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, created_at, last_login_at) FROM stdin;
1	admin	admin@example.com	$2b$12$VciT.Hpb.AkUd.BLuZmB2O4A4Y9ixmUB4EEh00KLyCeJI86zO.LJa	2026-06-27 07:47:28.358835+00	2026-06-27 07:47:43.51846+00
\.


--
-- Name: inventory_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_items_id_seq', 1, false);


--
-- Name: master_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.master_items_id_seq', 732, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: price_alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.price_alerts_id_seq', 1, false);


--
-- Name: price_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.price_history_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: master_items master_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_items
    ADD CONSTRAINT master_items_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: price_alerts price_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_pkey PRIMARY KEY (id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: inventory_items uq_inventory_user_item; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT uq_inventory_user_item UNIQUE (user_id, master_item_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_inventory_items_master_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_inventory_items_master_item_id ON public.inventory_items USING btree (master_item_id);


--
-- Name: ix_inventory_items_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_inventory_items_user_id ON public.inventory_items USING btree (user_id);


--
-- Name: ix_master_items_market_hash_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_master_items_market_hash_name ON public.master_items USING btree (market_hash_name);


--
-- Name: ix_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: ix_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: ix_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: ix_price_alerts_master_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_price_alerts_master_item_id ON public.price_alerts USING btree (master_item_id);


--
-- Name: ix_price_alerts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_price_alerts_user_id ON public.price_alerts USING btree (user_id);


--
-- Name: ix_price_history_fetched_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_price_history_fetched_at ON public.price_history USING btree (fetched_at);


--
-- Name: ix_price_history_master_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_price_history_master_item_id ON public.price_history USING btree (master_item_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: inventory_items inventory_items_master_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_master_item_id_fkey FOREIGN KEY (master_item_id) REFERENCES public.master_items(id) ON DELETE CASCADE;


--
-- Name: inventory_items inventory_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.price_alerts(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_master_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_master_item_id_fkey FOREIGN KEY (master_item_id) REFERENCES public.master_items(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: price_alerts price_alerts_master_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_master_item_id_fkey FOREIGN KEY (master_item_id) REFERENCES public.master_items(id) ON DELETE CASCADE;


--
-- Name: price_alerts price_alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: price_history price_history_master_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_master_item_id_fkey FOREIGN KEY (master_item_id) REFERENCES public.master_items(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict hpTGawjfvxPwLO8Hrx4ir9monvuAcbRjP2zjJdVRZ6TAmR9Ko8tDx7hAljujUIe

