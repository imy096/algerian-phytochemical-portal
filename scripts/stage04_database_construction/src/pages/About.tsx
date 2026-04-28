import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  Landmark,
  Leaf,
  Network,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <style>{`
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-14px) scale(1.025); }
        }

        @keyframes softPulse {
          0%, 100% { opacity: 0.18; transform: scale(1); }
          50% { opacity: 0.28; transform: scale(1.05); }
        }

        .float-logo {
          animation: floatLogo 7s ease-in-out infinite;
        }

        .soft-pulse {
          animation: softPulse 8s ease-in-out infinite;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="soft-pulse absolute left-[-140px] top-32 h-80 w-80 rounded-full bg-teal-200/30 blur-3xl" />
        <div className="soft-pulse absolute right-[-120px] top-56 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-[42px] border border-[#eadcc9] bg-gradient-to-br from-[#fbf3e6] via-white to-[#eaf8f5] px-8 py-16 shadow-[0_28px_80px_-40px_rgba(40,42,36,0.32)] lg:px-14">
        <div className="grid items-center gap-12 xl:grid-cols-[1fr_1fr]">
          <div>
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.24em] text-[#2b777b]">
              About Algeria Phyto-Chem
            </p>

            <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-tight text-[#42362d] md:text-6xl">
              A scientific platform for Algerian natural product discovery
            </h1>

            <p className="mt-7 max-w-3xl text-xl font-semibold leading-9 text-[#2b6f76]">
              The Algerian Chemogenomic Phytochemical Portal connects medicinal
              plants, phytochemicals, biological evidence, molecular targets, and
              reusable research data in one integrated environment.
            </p>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#776351]">
              It is designed to help researchers, laboratories, institutions, and
              decision makers transform scattered information into structured,
              searchable, interpretable knowledge.
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
                View knowledge graph
                <Network className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative flex min-h-[520px] items-center justify-center">
            <img
              src="/assets/about-portal-logo.png"
              alt="Algeria Phyto-Chem"
              className="float-logo w-[620px] max-w-none object-contain drop-shadow-[0_30px_45px_rgba(0,0,0,0.18)]"
            />
          </div>
        </div>
      </section>

      {/* PURPOSE */}
      <section className="mt-14 grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[38px] bg-[#12383b] p-9 text-white shadow-xl">
          <h2 className="text-4xl font-extrabold tracking-tight">
            Why this portal matters
          </h2>

          <p className="mt-6 text-lg leading-9 text-white/80">
            Algerian medicinal-plant knowledge is valuable, but it is often scattered
            across articles, chemical repositories, biological datasets, and local
            expertise. This portal organizes those layers into a usable research
            system.
          </p>

          <p className="mt-5 text-lg leading-9 text-white/80">
            The goal is to support scientific discovery, institutional visibility,
            research prioritization, and evidence-based decision making.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <ValueBlock
            icon={Leaf}
            title="Research"
            text="Helps scientists explore links between plants, compounds, and biological evidence."
          />
          <ValueBlock
            icon={Landmark}
            title="Leadership"
            text="Supports institutions and decision makers with a structured view of national scientific resources."
          />
          <ValueBlock
            icon={Network}
            title="Discovery"
            text="Reveals relationships, gaps, and candidate hypotheses for future validation."
          />
        </div>
      </section>

      {/* INTEGRATION */}
      <section className="mt-14 overflow-hidden rounded-[38px] border border-[#eadcc9] bg-white p-9 shadow-xl">
        <div className="grid gap-10 xl:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#2b777b]">
              Knowledge integration
            </p>

            <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-[#42362d]">
              From biodiversity to biological interpretation
            </h2>

            <p className="mt-5 text-lg leading-8 text-[#776351]">
              The portal is not a static catalogue. It is organized as connected
              scientific layers that allow users to move from plants to compounds,
              from compounds to biological evidence, and from individual records to
              relationship-level exploration.
            </p>
          </div>

          <div className="space-y-4">
            <LayerRow
              icon={Leaf}
              title="Plant knowledge"
              text="Medicinal flora, botanical context, and linked natural products."
            />
            <LayerRow
              icon={FlaskConical}
              title="Chemical knowledge"
              text="Phytochemicals, identifiers, descriptors, and compound-level evidence."
            />
            <LayerRow
              icon={Network}
              title="Relationship knowledge"
              text="Connections across plants, compounds, targets, signatures, and publications."
            />
            <LayerRow
              icon={BookOpen}
              title="Evidence context"
              text="Literature, bioactivity, transcriptomic context, and curated interpretation."
            />
          </div>
        </div>
      </section>

      {/* TRANSPARENCY + COLLAB */}
      <section className="mt-14 grid gap-8 xl:grid-cols-2">
        <LargePanel
          icon={ShieldCheck}
          title="Evidence transparency"
          text="The portal distinguishes between evidence types instead of treating all records as equal. Some information is experimentally measured, some is computationally inferred, and some is contextual or literature-based. This makes interpretation clearer and reduces overclaiming."
        />

        <LargePanel
          icon={Users}
          title="Collaboration and partners"
          text="The platform is prepared to document participating universities, laboratories, supervisors, curators, pharmacologists, chemists, bioinformaticians, institutional partners, and funding bodies."
          note="Add confirmed collaborators and affiliations here once the final list is validated."
        />
      </section>

      {/* FINAL IMPACT */}
      <section className="mt-14 rounded-[38px] bg-gradient-to-r from-[#12383b] via-[#174b4f] to-[#2b777b] p-9 text-white shadow-xl">
        <h2 className="text-4xl font-extrabold tracking-tight">Intended impact</h2>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Impact
            title="For researchers"
            text="Faster exploration of organized plant, compound, target, and evidence relationships."
          />
          <Impact
            title="For institutions"
            text="A structured digital resource supporting visibility, planning, and collaboration."
          />
          <Impact
            title="For discovery"
            text="A foundation for hypothesis generation, candidate prioritization, and future validation."
          />
        </div>
      </section>
    </div>
  );
}

function ValueBlock({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[32px] border border-[#eadcc9] bg-white p-7 shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-6 inline-flex rounded-2xl bg-[#edf8f6] p-4">
        <Icon className="h-7 w-7 text-[#2b777b]" strokeWidth={1.8} />
      </div>
      <h3 className="text-2xl font-extrabold text-[#42362d]">{title}</h3>
      <p className="mt-4 text-base leading-8 text-[#776351]">{text}</p>
    </div>
  );
}

function LayerRow({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-5 rounded-[28px] border border-[#eadcc9] bg-[#fbf7ef] p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <Icon className="h-6 w-6 text-[#2b777b]" strokeWidth={1.8} />
      </div>
      <div>
        <h3 className="text-xl font-extrabold text-[#42362d]">{title}</h3>
        <p className="mt-2 text-base leading-7 text-[#776351]">{text}</p>
      </div>
    </div>
  );
}

function LargePanel({
  icon: Icon,
  title,
  text,
  note,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  text: string;
  note?: string;
}) {
  return (
    <div className="rounded-[38px] border border-[#eadcc9] bg-gradient-to-br from-white to-[#fbf3e6] p-8 shadow-lg">
      <div className="mb-6 inline-flex rounded-2xl bg-[#edf8f6] p-4">
        <Icon className="h-7 w-7 text-[#2b777b]" strokeWidth={1.8} />
      </div>

      <h2 className="text-3xl font-extrabold tracking-tight text-[#42362d]">{title}</h2>
      <p className="mt-4 text-base leading-8 text-[#776351]">{text}</p>

      {note && (
        <div className="mt-6 rounded-2xl border border-[#d8c8b8] bg-white/80 p-5 text-sm leading-7 text-[#776351]">
          {note}
        </div>
      )}
    </div>
  );
}

function Impact({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-6">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-white/75">{text}</p>
    </div>
  );
}