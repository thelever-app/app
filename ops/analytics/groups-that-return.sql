-- Month 3 threshold (DEC-263): more than 30 % of the groups come back the following month.
--
-- A group is the players of a game that started, two or more; it comes back when at least two of
-- them start another game together on a later day, within 30 days. Counted over the groups of the
-- 30 days before the last 30, so every one has had its month. Run it in DBeaver, read only.
with games as (
  select
    fact->>'gameId' as game_id,
    min(occurred_at) as started_at,
    array_agg(distinct identity) as players
  from analytics_events
  where kind = 'game-started'
  group by fact->>'gameId'
),
groups as (
  select *
  from games
  where started_at >= now() - interval '60 days'
    and started_at < now() - interval '30 days'
    and cardinality(players) >= 2
),
returning_groups as (
  select groups.game_id
  from groups
  where exists (
    select 1
    from games later
    where later.started_at::date > groups.started_at::date
      and later.started_at <= groups.started_at + interval '30 days'
      and cardinality(array(select unnest(later.players) intersect select unnest(groups.players))) >= 2
  )
)
select
  (select count(*) from groups) as groups,
  (select count(*) from returning_groups) as came_back,
  round(
    100.0 * (select count(*) from returning_groups) / nullif((select count(*) from groups), 0),
    1
  ) as percent_that_came_back;
