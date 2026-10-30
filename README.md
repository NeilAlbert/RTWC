# RTWC

## Live streaming

Configure the YouTube channel URL or live video ID and Facebook live URL in
Admin > Settings. YouTube live detection uses the server-side `YOUTUBE_API_KEY`;
Facebook live detection uses `PAGE_ID` and `FB_PAGE_ACCESS_TOKEN` on the API
server. Keep these credentials on the server and never add them to browser code.
The live page embeds a stream when the provider supplies an embeddable live
video and otherwise offers its direct watch link. The live page also shows the current live title and description, if available.
