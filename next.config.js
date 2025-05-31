/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/run_sse',
        destination: 'http://localhost:8000/run_sse',
      },
      {
        source: '/list-apps',
        destination: 'http://localhost:8000/list-apps',
      },
      {
        source: '/apps/:path*',
        destination: 'http://localhost:8000/apps/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 