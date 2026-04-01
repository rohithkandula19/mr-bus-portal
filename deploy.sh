#!/bin/bash
cd /Users/rohithkandula/Desktop/mr_bus_portal_ultimate/backend
gcloud builds submit --tag us-central1-docker.pkg.dev/mr-bus-portal/mrbus-repo/mrbus-backend --quiet
gcloud run deploy mrbus-backend --image us-central1-docker.pkg.dev/mr-bus-portal/mrbus-repo/mrbus-backend --platform managed --region us-central1 --allow-unauthenticated --add-cloudsql-instances mr-bus-portal:us-central1:mrbus-db --memory 512Mi --min-instances 0 --max-instances 3 --quiet
cd /Users/rohithkandula/Desktop/mr_bus_portal_ultimate/frontend
npm run build
firebase deploy --only hosting
echo "Done! Live at https://busportal-e7802.web.app"
