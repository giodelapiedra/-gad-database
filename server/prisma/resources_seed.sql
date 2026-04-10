-- ============================================================================
-- Resources Seed — Sync local resource folders and files to Ubuntu DB
-- ============================================================================
-- This script:
--   1. Wipes existing resource_folders and resource_files
--   2. Inserts the local data (6 folders, 29 files)
--   3. Re-maps createdById/uploadedById to the first ADMIN user on Ubuntu
--      (so it works regardless of what user IDs exist there)
--   4. Bypasses FK checks during import to handle the circular FK in
--      resource_folders (parent → children → parent)
--
-- Run on Ubuntu:
--   sudo -u postgres psql -d gaddatabase -f /var/www/gad/server/prisma/resources_seed.sql
-- ============================================================================

BEGIN;

-- Bypass FK checks for the circular reference and missing user FK
SET LOCAL session_replication_role = 'replica';

-- Wipe existing data
TRUNCATE TABLE resource_files, resource_folders RESTART IDENTITY CASCADE;

-- ----------------------------------------------------------------------------
-- Folders (6 total)
-- ----------------------------------------------------------------------------

INSERT INTO public.resource_folders (id, name, "parentId", "createdById", "createdAt", "updatedAt") VALUES ('cmnpm7eii0001typog9d7ndtk', 'GAD RESOURCES', NULL, 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:35:55.193', '2026-04-08 05:35:55.193');
INSERT INTO public.resource_folders (id, name, "parentId", "createdById", "createdAt", "updatedAt") VALUES ('cmnpm9yxg000btypo2fyr8njg', 'Books', NULL, 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:37:54.964', '2026-04-08 05:37:54.964');
INSERT INTO public.resource_folders (id, name, "parentId", "createdById", "createdAt", "updatedAt") VALUES ('cmnpn6wa60001ty5o02w6vooq', 'IEC Materials', NULL, 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 06:03:31.182', '2026-04-08 06:08:43.951');
INSERT INTO public.resource_folders (id, name, "parentId", "createdById", "createdAt", "updatedAt") VALUES ('cmnpnee7m000bty5oqjvi6cjv', 'GAD Policies & Resources', NULL, 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 06:09:21.011', '2026-04-08 06:09:21.011');
INSERT INTO public.resource_folders (id, name, "parentId", "createdById", "createdAt", "updatedAt") VALUES ('cmnpmcuaa000ttypogboduemf', 'Laws on GAD', 'cmnpnee7m000bty5oqjvi6cjv', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:40:08.914', '2026-04-08 06:09:36.378');
INSERT INTO public.resource_folders (id, name, "parentId", "createdById", "createdAt", "updatedAt") VALUES ('cmnpmhmjd0001tysk60vl4nwj', 'GAD Code', 'cmnpnee7m000bty5oqjvi6cjv', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:43:52.153', '2026-04-08 06:09:36.378');

-- ----------------------------------------------------------------------------
-- Files (29 total)
-- ----------------------------------------------------------------------------

INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpm9eyr0003typoeiducyrw', 'resources/1775626647084-fkyj71-BARANGAY GPB AR TEMPLATE.pdf', 'BARANGAY GPB AR TEMPLATE.pdf', 138214, 'application/pdf', 'cmnpm7eii0001typog9d7ndtk', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:37:29.091');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpm9fcs0005typok3vm8747', 'resources/1775626649104-tos4uf-BARANGAY GPB TEMPLATE.xlsx', 'BARANGAY GPB TEMPLATE.xlsx', 17453, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'cmnpm7eii0001typog9d7ndtk', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:37:29.596');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpm9fps0007typocn6zelec', 'resources/1775626649604-k686zj-CITY AR TEMPLATE.xlsx', 'CITY AR TEMPLATE.xlsx', 14718, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'cmnpm7eii0001typog9d7ndtk', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:37:30.065');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpm9g2i0009typo4hx7hqi9', 'resources/1775626650072-1z66ap-CITY GPB TEMPLATE.xlsx', 'CITY GPB TEMPLATE.xlsx', 37841, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'cmnpm7eii0001typog9d7ndtk', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:37:30.522');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmba2f000dtypot7tealx4', 'resources/1775626729794-tttmax-A-Global-History-of-Early-and-Modern-Violence-1.pdf', 'A-Global-History-of-Early-and-Modern-Violence-1.pdf', 7517014, 'application/pdf', 'cmnpm9yxg000btypo2fyr8njg', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:38:56.055');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmbgwh000ftypoml6x17a3', 'resources/1775626736061-jq8og3-Babae-18-Fierce-and-Fierless-Filipinas.pdf', 'Babae-18-Fierce-and-Fierless-Filipinas.pdf', 15499131, 'application/pdf', 'cmnpm9yxg000btypo2fyr8njg', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:39:04.913');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmbmc5000htypodbwtzp9k', 'resources/1775626744918-9uhnlb-How-to-Raise-Your-Child.pdf', 'How-to-Raise-Your-Child.pdf', 11099413, 'application/pdf', 'cmnpm9yxg000btypo2fyr8njg', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:39:11.958');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmbp79000jtypoc19eyn65', 'resources/1775626751965-g6ouvo-I-am-the-Change-in-Climate-Change.pdf', 'I-am-the-Change-in-Climate-Change.pdf', 5288384, 'application/pdf', 'cmnpm9yxg000btypo2fyr8njg', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:39:15.669');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmbqlo000ltypoeqxitfv7', 'resources/1775626755677-st61up-Identity-Hashtagging-Race-Gender-Sexuality-and-Nation.pdf', 'Identity-Hashtagging-Race-Gender-Sexuality-and-Nation.pdf', 2526463, 'application/pdf', 'cmnpm9yxg000btypo2fyr8njg', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:39:17.484');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmbsym000ntypoc7ukt6yz', 'resources/1775626757491-trozer-The-Weight-of-Words-Alphabet-of-Human-Rights.pdf', 'The-Weight-of-Words-Alphabet-of-Human-Rights.pdf', 4508725, 'application/pdf', 'cmnpm9yxg000btypo2fyr8njg', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:39:20.542');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmc1ba000ptypo5wcdxl16', 'resources/1775626760550-iuxrcb-Karapat-Dapat.pdf', 'Karapat-Dapat.pdf', 15764987, 'application/pdf', 'cmnpm9yxg000btypo2fyr8njg', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:39:31.366');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmc4ps000rtypotlvv2xq5', 'resources/1775626771373-4kyaen-Safe-Space-Filipino.pdf', 'Safe-Space-Filipino.pdf', 5802187, 'application/pdf', 'cmnpm9yxg000btypo2fyr8njg', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:39:35.775');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmi2130003tysk4yhdapz7', 'resources/1775627042102-x3gywd-City-Ordinance-2022-27-GAD-Code.pdf', 'City-Ordinance-2022-27-GAD-Code.pdf', 11627030, 'application/pdf', 'cmnpmhmjd0001tysk60vl4nwj', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:44:12.231');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmi6mb0005tyskopjujkbx', 'resources/1775627052237-8a0wdd-City-Ordinance-2015-23-Amended-GAD-Code (1).pdf', 'City-Ordinance-2015-23-Amended-GAD-Code (1).pdf', 6563936, 'application/pdf', 'cmnpmhmjd0001tysk60vl4nwj', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:44:18.18');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmi8zc0007tyskybqfjk38', 'resources/1775627058182-tdsclk-City-Ordinance-2012-10-GAD-Code.pdf', 'City-Ordinance-2012-10-GAD-Code.pdf', 3508754, 'application/pdf', 'cmnpmhmjd0001tysk60vl4nwj', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:44:21.24');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmmoud0009tyskbp8ywbku', 'resources/1775627263847-c3y3ds-JMC-2016-01.pdf', 'JMC-2016-01.pdf', 5302113, 'application/pdf', 'cmnpmcuaa000ttypogboduemf', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:47:48.421');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmmsss000btyskci7xxnau', 'resources/1775627268424-eu90bd-pcw-dbm-dilg-neda-jmc-2013-01.pdf', 'pcw-dbm-dilg-neda-jmc-2013-01.pdf', 5452384, 'application/pdf', 'cmnpmcuaa000ttypogboduemf', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:47:53.549');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmmzh1000dtysk2oq6gyfi', 'resources/1775627273554-av2vxx-City-Ordinance-2013-15.pdf', 'City-Ordinance-2013-15.pdf', 8533121, 'application/pdf', 'cmnpmcuaa000ttypogboduemf', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:48:02.197');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmn3ox000ftyskoaa9ri9e', 'resources/1775627282200-htu6v3-City-Ordinance-2014-29-1.pdf', 'City-Ordinance-2014-29-1.pdf', 3989059, 'application/pdf', 'cmnpmcuaa000ttypogboduemf', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:48:07.665');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmn4sx000htyskm0j2htt5', 'resources/1775627287668-fgu40m-City-Ordinance-2018-21-2.pdf', 'City-Ordinance-2018-21-2.pdf', 988116, 'application/pdf', 'cmnpmcuaa000ttypogboduemf', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:48:09.105');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmn6w9000jtyskr8nd5eoo', 'resources/1775627289108-fmgd93-City-Ordinance-2014-40-1.pdf', 'City-Ordinance-2014-40-1.pdf', 2454313, 'application/pdf', 'cmnpmcuaa000ttypogboduemf', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:48:11.817');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmn8jx000ltyskbcou0g03', 'resources/1775627291820-gc3gj2-City-Ordinance-2018-38.pdf', 'City-Ordinance-2018-38.pdf', 1905197, 'application/pdf', 'cmnpmcuaa000ttypogboduemf', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:48:13.965');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmna8u000ntysk49fq2wnb', 'resources/1775627293968-2ln1om-City-Ordinance-2021-12.pdf', 'City-Ordinance-2021-12.pdf', 1479212, 'application/pdf', 'cmnpmcuaa000ttypogboduemf', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:48:16.158');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmnmu0000ptysk5kudtdhu', 'resources/1775627296160-i8btye-City-Ordinance-2021-13-Establishing-Migrants-Center.pdf', 'City-Ordinance-2021-13-Establishing-Migrants-Center.pdf', 20932909, 'application/pdf', 'cmnpmcuaa000ttypogboduemf', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:48:32.419');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpmnp92000rtyskvcx14kn2', 'resources/1775627312482-t1haoj-City-Ordinance-2022-14.pdf', 'City-Ordinance-2022-14.pdf', 3557708, 'application/pdf', 'cmnpmcuaa000ttypogboduemf', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 05:48:35.605');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpnbe0d0003ty5of75qs76k', 'resources/1775628418901-ivpl0g-MAGNA CARTA OF WOMEN.pdf', 'MAGNA CARTA OF WOMEN.pdf', 624655, 'application/pdf', 'cmnpn6wa60001ty5o02w6vooq', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 06:07:00.782');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpnbfw80005ty5o59bzr3sm', 'resources/1775628420787-i9q3ql-MANIFESTATION OF GENDER BIAS booklet.pptx', 'MANIFESTATION OF GENDER BIAS booklet.pptx', 1497003, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'cmnpn6wa60001ty5o02w6vooq', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 06:07:03.224');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpnbihq0007ty5o72z2g04x', 'resources/1775628423225-ddlr8s-RA 9262 Anti-VAWC booklet.pptx', 'RA 9262 Anti-VAWC booklet.pptx', 1895156, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'cmnpn6wa60001ty5o02w6vooq', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 06:07:06.59');
INSERT INTO public.resource_files (id, "fileName", "originalName", size, "mimeType", "folderId", "uploadedById", "createdAt") VALUES ('cmnpnbk8k0009ty5oicrfhrdx', 'resources/1775628426592-l0p9cn-SEX AND GENDER booklet.pptx', 'SEX AND GENDER booklet.pptx', 1379180, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'cmnpn6wa60001ty5o02w6vooq', 'cmnddr0fo0000tyx0hkwx1y81', '2026-04-08 06:07:08.852');

-- ----------------------------------------------------------------------------
-- Re-map createdById and uploadedById to the first ADMIN user on this DB.
-- This makes the seed work even if the original user ID doesn't exist on Ubuntu.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    admin_id TEXT;
BEGIN
    SELECT id INTO admin_id FROM users WHERE role = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1;

    IF admin_id IS NULL THEN
        RAISE EXCEPTION 'No ADMIN user found in users table. Please seed an admin user first.';
    END IF;

    UPDATE resource_folders SET "createdById" = admin_id WHERE "createdById" = 'cmnddr0fo0000tyx0hkwx1y81';
    UPDATE resource_files   SET "uploadedById" = admin_id WHERE "uploadedById" = 'cmnddr0fo0000tyx0hkwx1y81';

    RAISE NOTICE 'Re-mapped createdById/uploadedById to admin user: %', admin_id;
END $$;

-- Re-enable FK checks
SET LOCAL session_replication_role = 'origin';

COMMIT;

-- Verification
SELECT 'resource_folders' AS table_name, COUNT(*) AS row_count FROM resource_folders
UNION ALL
SELECT 'resource_files', COUNT(*) FROM resource_files;
