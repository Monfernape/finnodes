/** @type {import('next').NextConfig} */
const nextConfig = {
  redirects() {
    return [
      {
        source: "/",
        destination: "/expenses",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
