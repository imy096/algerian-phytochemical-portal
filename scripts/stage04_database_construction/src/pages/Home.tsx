import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Leaf, FlaskConical, Dna, Network, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';

type StatsResponse = {
  plant_taxon?: number;
  compound?: number;
  gene?: number;
  pathway?: number;
};

export default function Home() {
  const { data: stats } = useQuery<StatsResponse>({
    queryKey: ['stats'],
    queryFn: api.analytics.stats,
  });

  const statItems = [
    {
      label: 'Medicinal Plants',
      value: stats?.plant_taxon || 0,
      icon: Leaf,
      color: 'text-teal-700',
    },
    {
      label: 'Phytochemicals',
      value: stats?.compound || 0,
      icon: FlaskConical,
      color: 'text-gold-700',
    },
  ].filter((item) => item.value > 0);

  return (
    <div className="min-h-screen -mt-4">
      <style>{`
        @keyframes mapFloat {
          0%, 100% { transform: translateY(0px) rotate(-1deg) scale(1); }
          50% { transform: translateY(-12px) rotate(0.8deg) scale(1.025); }
        }

        @keyframes backMapFloat {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.10; }
          50% { transform: translateY(-8px) scale(1.035); opacity: 0.16; }
        }

        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px); opacity: 0.45; }
          50% { transform: translateY(-14px); opacity: 0.9; }
        }

        .map-float {
          animation: mapFloat 7s ease-in-out infinite;
        }

        .back-map-float {
          animation: backMapFloat 9s ease-in-out infinite;
        }

        .orb-float {
          animation: orbFloat 6s ease-in-out infinite;
        }
      `}</style>

      <section className="relative overflow-hidden rounded-[38px] border border-[#eadcc9] bg-gradient-to-br from-[#fbf3e6] via-[#fffdf9] to-[#eaf8f5] px-8 py-12 shadow-[0_24px_70px_-36px_rgba(40,42,36,0.34)] lg:px-12 lg:py-14">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src="/assets/logo_2-removebg-preview.png"
            alt=""
            className="back-map-float absolute left-[31%] top-[-10%] w-[920px] max-w-none object-contain"
          />

          <div className="absolute left-[5%] top-[18%] h-52 w-52 rounded-full bg-teal-200/20 blur-3xl" />
          <div className="absolute right-[8%] top-[18%] h-60 w-60 rounded-full bg-gold-200/20 blur-3xl" />
          <div className="orb-float absolute left-[49%] top-[66%] h-2.5 w-2.5 rounded-full bg-gold-500/35" />
          <div className="orb-float absolute left-[64%] top-[28%] h-3 w-3 rounded-full bg-teal-500/35" />
        </div>

        <div className="relative z-10 grid min-h-[560px] items-center gap-8 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="max-w-[720px]">
            <h1 className="text-[3.9rem] font-black uppercase leading-[0.92] tracking-tight text-[#4f4137] md:text-[5.3rem]">
              Algerian
              <br />
              Chemogenomic
            </h1>

            <h2 className="mt-3 text-[3.55rem] font-black uppercase leading-[0.92] tracking-tight text-[#2b6f76] md:text-[4.75rem]">
              Phytochemical
              <br />
              Portal
            </h2>

            <p className="mt-7 max-w-3xl text-xl font-semibold leading-9 text-[#6b5848]">
              Curated Algerian medicinal plants, phytochemicals, molecular targets,
              and biological evidence for discovery-oriented research.
            </p>

            <p className="mt-4 max-w-3xl text-base leading-8 text-[#7a6655]">
              A scientific database connecting Algerian flora, natural products,
              chemical identifiers, target evidence, and reusable research data.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/plants"
                className="inline-flex items-center gap-2 rounded-full bg-[#2b777b] px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#225f63]"
              >
                Explore database
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/graph"
                className="inline-flex items-center gap-2 rounded-full border border-[#d8c8b8] bg-white/85 px-6 py-3.5 text-sm font-semibold text-[#6b5848] shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700"
              >
                View network graph
                <Network className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {['Curated', 'Evidence-based', 'Research-ready'].map((x) => (
                <span
                  key={x}
                  className="rounded-full border border-[#d8c8b8] bg-white/70 px-4 py-2 text-xs font-medium text-[#6b5848]"
                >
                  {x}
                </span>
              ))}
            </div>
          </div>

          <div className="relative flex min-h-[540px] items-center justify-center overflow-visible">
            <img
              src="/assets/logo_2-removebg-preview.png"
              alt="Algeria Phyto-Chem map logo"
              className="map-float -ml-32 w-[620px] max-w-none object-contain drop-shadow-[0_24px_38px_rgba(0,0,0,0.16)] xl:-ml-44 xl:w-[700px]"
            />

            <div className="orb-float absolute left-[10%] top-[18%] rounded-full border border-white/60 bg-white/65 p-4 shadow-xl backdrop-blur-md">
              <Leaf className="h-8 w-8 text-teal-700" />
            </div>

            <div className="orb-float absolute right-[18%] top-[20%] rounded-full border border-white/60 bg-white/65 p-4 shadow-xl backdrop-blur-md">
              <FlaskConical className="h-8 w-8 text-gold-700" />
            </div>

            <div className="orb-float absolute bottom-[20%] right-[24%] rounded-full border border-white/60 bg-white/65 p-4 shadow-xl backdrop-blur-md">
              <Dna className="h-8 w-8 text-primary-700" />
            </div>
          </div>
        </div>

        {statItems.length > 0 && (
          <div className="relative z-10 mt-2 grid gap-5 md:grid-cols-2 xl:w-[660px]">
            {statItems.map((item) => (
              <div
                key={item.label}
                className="rounded-[24px] border border-[#eadcc9] bg-white/90 p-5 shadow-lg backdrop-blur-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl border border-[#eadcc9] bg-white p-3.5 shadow-sm">
                    <item.icon className={`h-6 w-6 ${item.color}`} strokeWidth={1.7} />
                  </div>
                  <div>
                    <p className="text-4xl font-extrabold tracking-tight text-[#4f4137]">
                      {item.value}
                    </p>
                    <p className="mt-1 text-base font-medium text-[#6b5848]">
                      {item.label}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="mb-6">
          <h3 className="text-4xl font-bold tracking-tight text-[#4f4137]">
            Explore the portal
          </h3>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-[#7a6655]">
            Begin with the main scientific entry points: Algerian flora,
            phytochemical compounds, and biological signatures.
          </p>
        </div>

        <div className="grid gap-7 md:grid-cols-3">
          <FeatureCard
            to="/plants"
            title="Plants"
            value={`${stats?.plant_taxon || 0} Plants`}
            description="Browse Algerian medicinal flora with linked compounds, taxonomy, and scientific context."
            image="https://images.pexels.com/photos/4503267/pexels-photo-4503267.jpeg?auto=compress&cs=tinysrgb&w=1200"
            icon={Leaf}
            tone="teal"
          />

          <FeatureCard
            to="/compounds"
            title="Compounds"
            value={`${stats?.compound || 0} Compounds`}
            description="Explore phytochemicals, molecular identifiers, linked evidence, and chemical descriptors."
            image="https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200"
            icon={FlaskConical}
            tone="gold"
          />

          <FeatureCard
            to="/signatures"
            title="Signatures"
            value="Signatures"
            description="Inspect biological signatures and expression-oriented evidence."
            image="https://images.pexels.com/photos/3825527/pexels-photo-3825527.jpeg?auto=compress&cs=tinysrgb&w=1200"
            icon={Dna}
            tone="primary"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  to,
  title,
  value,
  description,
  image,
  icon: Icon,
  tone,
}: {
  to: string;
  title: string;
  value: string;
  description: string;
  image: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: 'teal' | 'gold' | 'primary';
}) {
  const gradients: Record<string, string> = {
    teal: 'from-teal-500/90 to-teal-700/90',
    gold: 'from-gold-400/90 to-gold-600/90',
    primary: 'from-primary-400/90 to-primary-700/90',
  };

  return (
    <Link
      to={to}
      className="group overflow-hidden rounded-[28px] border border-[#eadcc9] bg-white shadow-lg transition duration-500 hover:-translate-y-2 hover:shadow-2xl"
    >
      <div className={`relative h-64 overflow-hidden bg-gradient-to-br ${gradients[tone]}`}>
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover opacity-35 mix-blend-overlay transition duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        <div className="absolute left-5 top-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/30 bg-white/20 shadow-xl backdrop-blur-md">
          <Icon className="h-8 w-8 text-white" strokeWidth={1.6} />
        </div>

        <div className="absolute bottom-5 right-5 rounded-full bg-white/95 px-5 py-2.5 text-sm font-bold text-[#4f4137] shadow-xl">
          {value}
        </div>
      </div>

      <div className="p-6">
        <h4 className="text-3xl font-bold text-[#4f4137]">{title}</h4>
        <p className="mt-3 text-base leading-7 text-[#7a6655]">{description}</p>
      </div>
    </Link>
  );
}