-- Month 3 threshold: more than 0.3 new rooms per room.
--
-- A new room is one created by someone who had joined the room of someone else before: the room
-- they played in gave birth to it. Counted over the rooms created in the last 30 days. Run it in
-- DBeaver, read only.
with created as (
  select identity, fact->>'roomId' as room_id, occurred_at
  from analytics_events
  where kind = 'room-created' and occurred_at >= now() - interval '30 days'
),
first_joined as (
  select identity, min(occurred_at) as joined_at
  from analytics_events
  where kind = 'room-joined'
  group by identity
)
select
  count(*) as rooms,
  count(*) filter (
    where exists (
      select 1 from first_joined
      where first_joined.identity = created.identity and first_joined.joined_at < created.occurred_at
    )
  ) as born_from_another,
  round(
    1.0 * count(*) filter (
      where exists (
        select 1 from first_joined
        where first_joined.identity = created.identity and first_joined.joined_at < created.occurred_at
      )
    ) / nullif(count(*), 0),
    2
  ) as new_rooms_per_room
from created;
