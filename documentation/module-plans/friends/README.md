# friends (planned)

## Legacy behaviour to preserve

- **Request** (`add-friend.php`): `friend_request(requested_by, requested_to, requested_date)`; re-sending
  updates the date. Target must be active and not deleted.
- **Pending requests** shown in the header (`header.inc.php`) and `friends-requests.php`.
- **Accept** (`accept-friend.php?action=a`): both members get each other's id appended to `user.friends`
  (comma-separated list); request row deleted. **Decline** = same endpoint without `action=a` → only deletes the request.
- **Unfriend** (`friends.php?action=delete`): removes the id from the current member's `friends` list.
- Friend list with online badge; online-friends list feeds the chat widget.

## Planned endpoints (`/api/v1/friends`)

`GET /`, `DELETE /:userId`, `GET /requests/incoming`, `GET /requests/outgoing`, `POST /requests/:userId`,
`POST /requests/:userId/accept`, `POST /requests/:userId/decline`.

## Must NOT reproduce

B-15 friendships stored as a CSV string in `user.friends` → `friendships` junction table; accept handler checks the
wrong array for the requester (duplicates possible) · B-16 unfriend is one-sided (the other member still lists you) ·
B-05 state changes via GET links.
