
Backend Deployment:

gcloud builds submit --tag gcr.io/YOUR_PROJECT/mrbus-api

gcloud run deploy mrbus-api --image gcr.io/YOUR_PROJECT/mrbus-api --region us-central1

Frontend:

Use Firebase Hosting or Vercel.
