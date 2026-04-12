// Use the running server to delete posts
const baseUrl = 'http://localhost:3000/api/trpc';

// Get auth token first by making a request
const authRes = await fetch(`${baseUrl}/auth.me?input={}`);
const authData = await authRes.json();
console.log('Auth check:', authData);

// Try to delete all drafts by calling a mutation
// We'll need to find the right endpoint - let's check what's available
const listRes = await fetch(`${baseUrl}/queue.listPosts?input={}`);
const listData = await listRes.json();
console.log('Posts:', listData);
