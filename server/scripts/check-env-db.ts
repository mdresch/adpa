import 'dotenv/config';
const url = process.env.DATABASE_URL;
if (url) {
    const parsed = new URL(url);
    console.log(`Hostname: ${parsed.hostname}`);
    console.log(`Username: ${parsed.username}`);
    console.log(`Port: ${parsed.port}`);
} else {
    console.log('DATABASE_URL not found');
}
