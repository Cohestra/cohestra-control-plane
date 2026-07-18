import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Cohestra',
  tagline: 'Open-source data infrastructure — durable pipelines and stream processing on any Kubernetes cluster',
  favicon: 'img/favicon.png',

  future: { v4: true },

  url: 'https://cohestra.dev',
  baseUrl: '/',

  organizationName: 'Cohestra',
  projectName: 'cohestra-control-plane',

  onBrokenLinks: 'throw',

  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/Cohestra/cohestra-control-plane/tree/main/docs-site/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/logo.png',
      colorMode: {
        defaultMode: 'light',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Cohestra',
        logo: {
          alt: 'Cohestra Logo',
          src: 'img/logo.png',
          width: 56,
          height: 56,
        },
        items: [
          { type: 'docSidebar', sidebarId: 'docsSidebar', position: 'left', label: 'Docs' },
          { to: '/docs/sdk/python', label: 'Python SDK', position: 'left' },
          { to: '/docs/sdk/go', label: 'Go SDK', position: 'left' },
          { to: '/docs/sdk/java', label: 'Java SDK', position: 'left' },
          { to: '/docs/api-reference', label: 'API', position: 'left' },
          {
            href: 'https://github.com/Cohestra/cohestra-control-plane',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'light',
        logo: {
          alt: 'Cohestra Logo',
          src: 'img/logo.png',
          width: 48,
          height: 48,
        },
        links: [
          {
            title: 'Documentation',
            items: [
              { label: 'Getting Started', to: '/docs/getting-started' },
              { label: 'API Reference', to: '/docs/api-reference' },
              { label: 'Autoscaling', to: '/docs/autoscaling/overview' },
            ],
          },
          {
            title: 'SDKs',
            items: [
              { label: 'Python', to: '/docs/sdk/python' },
              { label: 'Go', to: '/docs/sdk/go' },
              { label: 'Java', to: '/docs/sdk/java' },
            ],
          },
          {
            title: 'Products',
            items: [
              { label: 'Control Plane', href: 'https://github.com/Cohestra/cohestra-control-plane' },
              { label: 'DataFlow', href: 'https://github.com/Cohestra/cohestra-dataflow' },
            ],
          },
          {
            title: 'Community',
            items: [
              { label: 'GitHub', href: 'https://github.com/Cohestra' },
              { label: 'Contributing', href: 'https://github.com/Cohestra/cohestra-control-plane/blob/main/CONTRIBUTING.md' },
            ],
          },
        ],
        copyright: `Copyright ${new Date().getFullYear()} Cohestra Contributors. Apache-2.0 Licensed.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['java', 'bash', 'json', 'yaml', 'go'],
      },
    }),
};

export default config;
