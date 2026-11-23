-- Where the first visits came from: the posters of the bars, each creator, or none, and
-- how many of those visitors went on to play: created a room, or joined one. Counted over the
-- first visits of the last 30 days. Run it in DBeaver, read only.
with visits as (
  select
    identity,
    occurred_at,
    coalesce(fact->'origin'->>'source', '(none)') as source,
    coalesce(fact->'origin'->>'campaign', '(none)') as campaign,
    coalesce(fact->'origin'->>'content', '(none)') as content
  from analytics_events
  where kind = 'first-visit' and occurred_at >= now() - interval '30 days'
)
select
  source,
  campaign,
  content,
  count(*) as first_visits,
  count(*) filter (
    where exists (
      select 1 from analytics_events played
      where played.identity = visits.identity and played.kind in ('room-created', 'room-joined')
    )
  ) as went_on_to_play
from visits
group by source, campaign, content
order by first_visits desc;
