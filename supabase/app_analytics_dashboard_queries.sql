-- Run these read-only queries in the Supabase SQL Editor.

-- Total clicks on "Descargar APK" (not verified completed downloads).
select count(*) as apk_download_button_clicks
from public.app_analytics_events
where event_name = 'apk_download_click';

-- Unique Android app installations that have opened the app since tracking began.
select count(*) as android_installations_opened
from public.app_installations
where platform = 'android';

-- Counts by day for download button clicks.
select date_trunc('day', created_at)::date as day, count(*) as clicks
from public.app_analytics_events
where event_name = 'apk_download_click'
group by 1
order by 1 desc;
