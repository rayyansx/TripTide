# TripTide MVP

A phone app you can plan a real trip in. Sign in, make the trip, fill the days, book the travel, track the money, pack, and share it with the people going. The screen should feel finished: the same phone shell as the rest of the app, with real empty, loading, and error states.

The server in `server/` stays the source of truth. The app in `native/` talks to it. AI, suggestions, and generated plans are a later project. This MVP is the set of screens and data those features will write into.

## Already built

- Sign in with email and password, session kept on the device.
- Home: greeting, trip cards, covers, filters, create and edit with dates, archive, copy, delete.
- Trip chrome: day chips, plan list, places list, map, and dock tabs for travel, bookings, budget, packing, files, and chat.
- Those trip tabs load data and display it. They do not create or edit it.
- Settings: light, dark, and auto, plus sign out.
- Map uses the same OpenFreeMap idea as the web app, inside a web view.

## Leave for after the MVP

- AI: itinerary generation, place suggestions, chat assistants, smart packing.
- Offline editing and the unused SQLite stub in `native/src/db/nativeDb.ts`.
- Road-trip corridor search, Atlas, collections, vacay, and journey.
- Admin, plugins, and instance setup. Those stay on the website.
- Push notifications.

## How to build it

Work in this order. Each slice should be usable on a device before the next one starts. Match the phone UI that is already on the home screen: paper background, glass bars, sheets for forms, confirm before delete.

### 1. Itinerary

This is the planner. Everything else hangs off days and places.

- Add, rename, and remove days. Changing the trip dates on the home screen should keep the days in line with the server.
- Search for a place and add it to a day.
- Edit a stop: name, time, notes, and which day it sits on.
- Reorder stops inside a day, and move a stop to another day.
- Remove a stop.
- The map for the selected day shows those stops, in order, and updates after an edit.
- Pull to refresh. Opening the trip again shows the latest plan.

The read path is already in `native/src/screens/Trip/TripScreen.tsx`. The write path is the trips, days, and places API the website uses.

### 2. Travel and bookings

- List flights, trains, and other transport separately from stays and other bookings. The panel already splits them.
- Add, edit, and delete a booking: type, title, date and time, confirmation code, and notes.
- A booking can point at a day when it belongs to one.
- Empty state explains how to add the first booking.

### 3. Budget

- Show the trip total and a simple breakdown by category.
- Add, edit, and delete an expense: title, amount, category, and who paid if the server already stores that.
- Currency is the trip currency chosen when the trip was created. Add that field to the home trip sheet if it is not there yet.
- Amounts use the device locale.

### 4. Packing

- Lists of items with a checkbox.
- Add an item, rename it, check it, uncheck it, and delete it.
- Add a list when the trip has more than one.
- The checked count is visible on the list.

### 5. Files

- Upload a photo or document from the phone.
- See the file name and open a preview for images and PDFs the server can serve.
- Delete a file you uploaded.

### 6. People on the trip

- Show who is on the trip, including the owner.
- Invite someone by the identifier the server already accepts.
- Remove a member when you are allowed to.
- The home card traveller count stays in step with this list.

Chat, polls, and threaded notes can wait. A shared trip that both people can edit is enough for the MVP. Reload when the screen is focused. Live updates over the existing websocket client can follow once editing is solid.

### 7. Finish the shell

- Home notifications either list real notifications or the bell goes away until that exists. An empty sheet that always says there are none should not ship.
- Settings stays small: appearance, the signed-in account, and sign out.
- Every editor handles a failed save with the server’s message, and a second tap does not send the request twice.
- Forms sit above the keyboard. Sheets scroll. Dates use the system date picker.
- The first screen after sign-in, an empty trip, and a trip with a full itinerary all look intentional.

## Done when

Someone who has never seen the website can, on a phone:

1. Sign in.
2. Create a trip with dates and a cover.
3. Build a day-by-day plan and see it on the map.
4. Add a booking, an expense, and a packing item.
5. Attach a file.
6. Invite another account and have that account see and edit the same trip.

No step depends on AI. When this is true, an AI feature can create days, places, bookings, and packing items through the same screens and API.
