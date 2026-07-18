import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          Cohestra
        </Heading>
        <p className="hero__subtitle">
          Open-source data infrastructure — durable pipelines and stream
          processing on any Kubernetes cluster
        </p>
      </div>
    </header>
  );
}

const products = [
  {
    name: 'Cohestra Control Plane',
    badge: 'Open source · Apache-2.0',
    description:
      'Deployment management for Apache Flink on any Kubernetes cluster. ' +
      'Actor-model control loops, autoscaling, and Temporal-backed ' +
      'orchestration for streaming jobs.',
    links: [
      { label: 'Documentation', to: '/docs/', primary: true },
      { label: 'GitHub', href: 'https://github.com/Cohestra/cohestra-control-plane' },
    ],
  },
  {
    name: 'DataFlow',
    badge: 'Open core · Free + Commercial',
    description:
      'Visual, durable data pipelines powered by Go and Temporal. ' +
      'Drag-and-drop canvas with AI-drafted DAGs, versioned lifecycles, ' +
      'backfills, lineage, and data quality built in.',
    tiers: [
      {
        title: 'Free',
        items:
          'Visual builder · manifest connectors · versions & promotion · ' +
          'runs & backfills · lineage · data quality · analytics',
      },
      {
        title: 'Commercial',
        items:
          'Advanced connectors · realtime · Spark SQL · Flink SQL · ' +
          'stateful processing · deep observability · governance',
      },
    ],
    links: [
      { label: 'Sign in', href: 'https://cohestra.dev/dataflow/login', primary: true },
      { label: 'GitHub', href: 'https://github.com/Cohestra/cohestra-dataflow' },
    ],
  },
];

function ProductCard({ product }) {
  return (
    <div className={clsx('card', styles.productCard)}>
      <div className="card__header">
        <Heading as="h2">{product.name}</Heading>
        <span className={clsx('badge badge--secondary', styles.productBadge)}>
          {product.badge}
        </span>
      </div>
      <div className="card__body">
        <p>{product.description}</p>
        {product.tiers &&
          product.tiers.map((tier) => (
            <p key={tier.title} className={styles.tierLine}>
              <strong>{tier.title}:</strong> {tier.items}
            </p>
          ))}
      </div>
      <div className="card__footer">
        <div className={styles.cardButtons}>
          {product.links.map((link) => (
            <Link
              key={link.label}
              className={clsx(
                'button',
                link.primary ? 'button--primary' : 'button--outline button--primary'
              )}
              to={link.to}
              href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <section className={clsx('container', styles.products)}>
          {products.map((product) => (
            <ProductCard key={product.name} product={product} />
          ))}
        </section>
      </main>
    </Layout>
  );
}
