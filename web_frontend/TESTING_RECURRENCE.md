Manual acceptance checklist for recurrence/all-day behavior

Goal
------
Verify that the editor correctly distinguishes series vs single-occurrence edits/deletes, that all-day events are handled as date-only in UI and saved as start_ts/end_ts with end = start + 1 day, and that the recurrence modal/radio UI drives the correct backend endpoints.

Preconditions
------------
- There is a calendar you can edit (you have write/delete rights as owner or moderator).
- Have examples of:
	- a recurring event with a recurrence rule (with rule_id available in data),
	- a repeating event occurrence where rule_id is not present (to test fallback),
	- an all-day event (start at 00:00 and end = start + 1d),
	- a normal datetime event.

Expected requests
-----------------
- Series edit/delete: PATCH /calendars/{calid}/events/{eventId} (edit) or DELETE /calendars/{calid}/events/{eventId} (delete)
- Single-occurrence edit: PATCH /recurrence/{rule_id}/occurrence with body { original_start_ts, ...fields } (if rule_id exists). Fallback: PATCH /calendars/{calid}/events/{eventId}/occurrences with { original_start_ts, ... } when rule_id missing.
- Single-occurrence delete: PATCH /recurrence/{rule_id}/occurrence with { original_start_ts, cancelled: 1 } (if rule_id exists). Fallback: DELETE /calendars/{calid}/events/{eventId}/occurrences with { start_ts }.

Checklist (run these steps)
--------------------------
1. Open month view and click a recurring occurrence. Verify the editor URL contains `start_ts` and (when available) `rule_id`.
2. Header: when editing an occurrence, confirm the header shows "Редактирование экземпляра: <date/time>".
3. All-day load: open an all-day event (server returns start_ts at 00:00 and end_ts=start+1d). The editor should show the All-day checkbox checked, Start as a date (YYYY-MM-DD), and End should be hidden.
4. Toggle all-day ON from a datetime event: End should clear and Start should become date-only representing the same local date. Save. Verify server receives end_ts = start + 1 day.
5. Toggle all-day OFF: End field appears empty. User can fill it and save. Server should receive provided end_ts.
6. Recurrence scope preselect: for a recurring event, use the new radio buttons to select "только этот экземпляр" and save. Confirm the request uses PATCH /recurrence/{ruleId}/occurrence with original_start_ts and does NOT include recurrence.
7. Recurrence series: select "вся серия" and save. Confirm the request uses PATCH /calendars/{id}/events/{eventId} and includes recurrence when provided.

Additional fragile cases to check (important)
------------------------------------------
- this + save WITHOUT rule_id: open an occurrence where the backend does not provide rule_id. Attempt to save with scope="только этот экземпляр". Expected behavior: either the fallback endpoint PATCH /calendars/{calid}/events/{eventId}/occurrences is used successfully, or (if the server returns an error) the UI shows a clear human-friendly error explaining the operation is not supported.
- forced all-day via query: open editor with `?all_day=1&start_ts=YYYY-MM-DD` — this must force allDay=true regardless of 24h heuristic. Verify Start is date-only and End hidden, and save sets end_ts = start + 1 day.

Notes:
- If scopeChoice is not selected, the legacy modal will appear on save/delete; after choosing it persists for subsequent operations.
- If rule_id is missing and fallback operation fails, the UI will show a friendly error explaining the inability to operate on a single occurrence.

Done criteria
-------------
If all checklist items (including the two additional fragile cases) pass on local/staging, consider the recurrence/all-day UI feature accepted and ready for merge.
