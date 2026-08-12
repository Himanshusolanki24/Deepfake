-- seed.sql
-- AUTHENTIQ: development seed data. Clearly fictional/demo records only.

-- Recreate the seed on every `supabase db reset`.
begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------ demo user
-- The profiles trigger creates the matching profile row automatically.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',  -- fixed uuid: demo analyst
  'authenticated', 'authenticated', 'demo@authentiq.dev',
  crypt('DemoPass123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"],"role":"analyst"}',
  '{"full_name":"Demo Analyst"}',
  now(), now()
)
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name, role)
values
  ('11111111-1111-1111-1111-111111111111', 'demo@authentiq.dev', 'Demo Analyst', 'analyst')
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role;

-- ------------------------------------------------------------ demo analyses
insert into public.analyses (
  id, user_id, case_id, media_type, filename, status, verdict,
  confidence, confidence_lower, confidence_upper, processing_time_ms,
  explanation, created_at, completed_at
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '11111111-1111-1111-1111-111111111111',
    'VID-2026-00182', 'video', 'politician_interview.mp4',
    'completed', 'suspicious', 0.87, 0.79, 0.94, 42300,
    'Multiple independent forensic signals deviate from expected baselines; human review recommended.',
    now() - interval '2 hours', now() - interval '1 hour'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '11111111-1111-1111-1111-111111111111',
    'IMG-2026-00417', 'image', 'family_photo.jpg',
    'completed', 'authentic', 0.12, 0.06, 0.21, 9800,
    'Spatial, frequency and metadata signals found no consistent indication of manipulation.',
    now() - interval '1 day', now() - interval '23 hours'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '11111111-1111-1111-1111-111111111111',
    'AUD-2026-00753', 'audio', 'synthetic_voice.wav',
    'completed', 'manipulated', 0.94, 0.89, 0.98, 27500,
    'Vocoder artifacts and spectral irregularity indicate synthetic speech generation.',
    now() - interval '3 days', now() - interval '2 days'
  )
on conflict (id) do nothing;

-- ------------------------------------------------------------ media_files
insert into public.media_files (
  id, analysis_id, user_id, storage_path, original_filename, mime_type,
  file_size, sha256, duration_seconds, width, height
)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '11111111-1111-1111-1111-111111111111',
    'media/11111111-1111-1111-1111-111111111111/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1/original',
    'politician_interview.mp4', 'video/mp4',
    48234500, repeat('a', 64), 96.4, 1920, 1080
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '11111111-1111-1111-1111-111111111111',
    'media/11111111-1111-1111-1111-111111111111/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2/original',
    'family_photo.jpg', 'image/jpeg',
    2841000, repeat('b', 64), null, 4032, 3024
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '11111111-1111-1111-1111-111111111111',
    'media/11111111-1111-1111-1111-111111111111/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3/original',
    'synthetic_voice.wav', 'audio/wav',
    12088000, repeat('c', 64), 78.2, null, null
  )
on conflict (id) do nothing;

-- ------------------------------------------------------------ signal_results
insert into public.signal_results (
  id, analysis_id, signal_type, score, confidence, severity,
  status, explanation, model_name, model_version
)
values
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'spatial', 0.81, 0.86, 'high',
    'available', 'Boundary artifacts around the facial region.', 'spatial-detect-v1', '1.4.0'
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'temporal', 0.74, 0.82, 'medium',
    'available', 'Subtle frame-to-frame incoherence detected.', 'temporal-detect-v1', '1.2.1'
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc3',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'spatial', 0.09, 0.78, 'low',
    'available', 'No significant spatial artifacts found.', 'spatial-detect-v1', '1.4.0'
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc4',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'voice-spectral', 0.93, 0.95, 'high',
    'available', 'Vocoder fingerprints consistent with synthetic voice.', 'voice-detect-v1', '2.0.0'
  )
on conflict (id) do nothing;

-- ------------------------------------------------------------ evidence
insert into public.evidence (
  id, analysis_id, signal_result_id, type, title, description,
  score, confidence, frame_number, artifact_path, metadata
)
values
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddd1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    'heatmap', 'Spatial manipulation heatmap', 'Region of suspected compositing.',
    0.81, 0.86, 4, 'evidence/{user}/{analysis}/heatmaps/face.png',
    '{"region":"face","x":620,"y":280,"width":240,"height":220}'
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddd2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'cccccccc-cccc-cccc-cccc-ccccccccccc4',
    'spectrogram', 'Voice spectrogram', 'Irregular spectral texture in low band.',
    0.93, 0.95, null, 'evidence/{user}/{analysis}/spectra/voice.png',
    '{"band":"low","start":12.4,"end":61.8}'
  )
on conflict (id) do nothing;

-- ------------------------------------------------------------ suspicious_frames
insert into public.suspicious_frames (analysis_id, frame_number, timestamp_seconds, score, image_path)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 4, 3.2, 0.83, 'evidence/{user}/{analysis}/frames/0004.jpg'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 67, 42.1, 0.79, 'evidence/{user}/{analysis}/frames/0067.jpg'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 118, 73.9, 0.76, 'evidence/{user}/{analysis}/frames/0118.jpg')
on conflict (id) do nothing;

-- ------------------------------------------------------------ metadata_records
insert into public.metadata_records (analysis_id, exif, c2pa, codec, software, creation_time, compression_info)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '{"exifStatus":"stripped","software":null}',
    '{"status":"not-present"}',
    'h264', 'OBS Studio 28.1', now() - interval '2 hours',
    '{"double_compression":true,"encoder":"x264"}'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '{"exifStatus":"present","camera":"iPhone 15 Pro"}',
    '{"status":"verified"}',
    null, 'iOS 17', now() - interval '1 day',
    '{"double_compression":false}'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '{"exifStatus":"absent"}',
    '{"status":"not-present"}',
    'pcm_16', 'audacity', now() - interval '3 days',
    '{"double_compression":false}'
  )
on conflict (id) do nothing;

-- ------------------------------------------------------------ api_keys (demo)
insert into public.api_keys (id, user_id, name, key_hash, key_prefix)
values
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
    '11111111-1111-1111-1111-111111111111',
    'Local development',
    encode(sha256('ak_demo_local_development_only_key'), 'hex'),
    'ak_demo'
  )
on conflict (id) do nothing;

commit;