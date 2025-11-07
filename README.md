# CrossPay — Auto-Update Edition

This version includes an **update helper** so you can paste AI-generated updates and apply them with one command.

## Quick start (local)
1. Unzip and open the project folder.
2. Install deps:
   - `cd server && npm install`
   - `cd ../client && npm install`
3. Copy `.env.example` to `.env` and add your keys (do NOT commit .env).
4. Start server:
   - `cd server && npm run dev`
5. Start client:
   - `cd client && npm start`

## How to apply AI updates (one command)
1. Paste the update I give you into `updates/latest_update.txt` following this format:

```
--- FILE: server/somefile.js
// new content for the file...
--- END
--- FILE: client/src/components/NewComp.jsx
// component content
--- END
```

2. Run:
```
bash update_from_prompt.sh
```

The script will apply files, commit with your message, and push to GitHub.

## Deployment
Recommended:
- Backend: Render
- Frontend: Vercel
- DB: MongoDB Atlas

