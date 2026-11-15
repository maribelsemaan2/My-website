import {
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import './ResearchExplorer.css';

const SECTIONS = [
  { id: 'intro', label: 'Introduction' },
  { id: 'behavior', label: 'Fire behavior in space' },
  { id: 'moon', label: 'Fire on the Moon' },
  { id: 'mars', label: 'Fire on Mars' },
  { id: 'risks', label: 'Fire risks on board' },
  { id: 'solutions', label: 'Proposed solutions' },
  { id: 'conclusion', label: 'Conclusion' },
];

// Ratios relative to Earth, as derived in the note (buoyant velocity ∝ √g, Grashof number ∝ g).
const GRAVITY_TABLE = [
  {
    place: 'Earth',
    g: '9.81 m/s²',
    gRatio: 1,
    velocity: 1,
    grashof: 1,
  },
  {
    place: 'Mars',
    g: '≈ 3.71 m/s² (0.38 g)',
    gRatio: 0.38,
    velocity: Math.sqrt(0.38),
    grashof: 0.38,
  },
  {
    place: 'Moon',
    g: '≈ 1.62 m/s² (≈ 1/6 g)',
    gRatio: 1 / 6,
    velocity: Math.sqrt(1 / 6),
    grashof: 1 / 6,
  },
  {
    place: 'ISS (microgravity)',
    g: '≈ 0',
    gRatio: 0,
    velocity: 0,
    grashof: 0,
  },
];

const RISKS = [
  {
    title: 'Electrical fires',
    text: 'Damaged wires, short circuits or overloaded equipment generate excessive heat that can ignite nearby materials. Electrical energy is converted into thermal energy.',
  },
  {
    title: 'Fuel and organic material fires',
    text: 'Leaked fuel or flammable materials meet an ignition source. Combustion converts chemical energy into heat and light, releasing hot gases and smoke.',
  },
  {
    title: 'Battery fires',
    text: 'An overheated or damaged battery releases more heat through internal reactions. This can lead to thermal runaway, where heat triggers more reactions and eventually a fire.',
  },
  {
    title: 'Oxygen-related fires',
    text: 'Oxygen supports burning. When its concentration is too high, materials burn faster and more intensely.',
  },
  {
    title: 'Equipment overheating',
    text: 'Machines and electronics can produce excessive heat that ignites nearby materials and lets fire spread through the cabin.',
  },
];

function Formula({ children, note }) {
  return (
    <div className="rx-formula">
      <code>{children}</code>
      {note && <span>{note}</span>}
    </div>
  );
}

function Solution({ n, title, children }) {
  return (
    <article className="rx-solution">
      <span className="rx-solution-n">{n}</span>
      <div>
        <h4>{title}</h4>
        {children}
      </div>
    </article>
  );
}

function Bar({ value }) {
  return (
    <span className="rx-bar" aria-hidden="true">
      <span
        style={{
          width: `${Math.min(1, value) * 100}%`,
        }}
      />
    </span>
  );
}

export default function ResearchExplorer() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Desktop: size the layout to the space below the header so the page itself never scrolls.
  // The sidebar stays put and only the essay scrolls (see ResearchExplorer.css).
  useLayoutEffect(() => {
    const el = rootRef.current;
    const measure = () => {
      const top =
        el.getBoundingClientRect().top + window.scrollY;
      el.style.setProperty(
        '--rx-top',
        `${Math.round(top)}px`,
      );
    };
    measure();
    window.addEventListener('resize', measure);
    return () =>
      window.removeEventListener('resize', measure);
  }, []);

  return (
    <div className="rx" ref={rootRef}>
      <aside
        className={`rx-toc ${open ? 'rx-toc--open' : ''}`}
        aria-label="Contents"
      >
        <button
          type="button"
          className="rx-toc-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          Contents
        </button>
        <nav>
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setOpen(false)}
            >
              {s.label}
            </a>
          ))}
        </nav>
      </aside>

      <article className="rx-doc">
        <header className="rx-head">
          <span className="rx-kicker">
            TEAM RESEARCH NOTE
          </span>
          <h2>
            Physics Modeling and Solutions for
            Microgravity and Reduced-gravity Fire
            Suppression
          </h2>
          <p className="rx-byline">
            Giovanna Medawar · Undergraduate physics
            student, Notre Dame University (NDU)
          </p>
          <div className="rx-scope" role="note">
            <b>How to read this.</b> This note uses
            published scaling arguments and proposes
            design ideas. It is theoretical and was not
            derived from, or validated against, the NASA
            BASS-II data used in the Predictive Lab.
            That data covers ISS microgravity only, so
            the Moon and Mars figures below are scaling
            estimates, not measurements.
          </div>
        </header>

        <section id="intro">
          <h3>Introduction</h3>
          <p>
            For many years, NASA has been exploring how
            natural phenomena behave in order to build a
            better future. Fire's behavior in space is
            one such subject. Many fires have occurred
            in spacecraft, complicating space missions.
            The goal is to prevent such accidents as
            much as possible and keep the crew safe.
          </p>
          <p>
            This study explores ways to reduce fire risk
            and improve fire safety in future space
            environments, including lunar bases, Mars
            habitats, space stations and pressurized
            rovers. By understanding how fire behaves in
            microgravity and other reduced-gravity
            environments, we hope to contribute to safer
            conditions for astronauts on future
            missions.
          </p>
        </section>

        <section id="behavior">
          <h3>Understanding fire behavior in space</h3>
          <p>
            Microgravity flames have been studied using
            drop towers, parabolic flights, sounding
            rockets, suborbital flights and space
            missions. Unlike on Earth, flames in
            microgravity tend to become <b>spherical</b>{' '}
            rather than elongated or teardrop-shaped.
            They can also appear <b>blue</b> because of
            weaker combustion and less soot production.
          </p>
          <p>
            With almost no buoyancy, flames do not rise
            or flicker as they do on Earth. Heat and
            oxygen move mainly by diffusion. These
            differences affect how fires spread and can
            make them harder to detect and control.
          </p>
          <div className="rx-compare">
            <div>
              <h4>On Earth</h4>
              <p>
                Flame shape is set by buoyancy and
                gravitational density gradients.
              </p>
              <Formula note="v = upward flow velocity, g = gravitational acceleration, L = characteristic flame length, Δρ = density difference between surrounding air and hot gases, ρ = surrounding air density">
                v ∝ √( g · L · Δρ / ρ )
              </Formula>
              <Formula note="Q = fuel flow rate, g = gravity">
                Flame height: L_Earth ∝ ( Q² / g )^(1/5)
              </Formula>
            </div>
            <div>
              <h4>In microgravity</h4>
              <p>
                Flames rely on molecular diffusion
                alone.
              </p>
              <Formula note="ṁf = fuel burning rate, ρ = gas density, D = molecular diffusion coefficient, B = Spalding mass transfer number">
                Flame radius: R_f = ṁf / ( 4π · ρ · D ·
                ln(1 + B) )
              </Formula>
              <Formula note="L = jet length, Q = fuel flow rate, D = molecular diffusion coefficient">
                Jet length: L ∝ Q / D
              </Formula>
            </div>
          </div>
          <p>
            Because flames behave differently on Earth
            and in microgravity, different approaches
            are needed to ensure fire safety in space.
          </p>
        </section>

        <section id="moon">
          <h3>
            Fire behavior on the Moon (lunar gravity)
          </h3>
          <p>
            Lunar gravity is about 1/6 of Earth's, so
            flames burn more slowly and become wider and
            rounder. NASA's Flammability of Materials on
            the Moon (FM2) project studies how materials
            burn under lunar conditions.
          </p>
          <ul className="rx-list">
            <li>
              <b>Shape:</b> wider and rounder than
              Earth's teardrop-shaped flames.
            </li>
            <li>
              <b>Oxygen:</b> materials can burn at lower
              oxygen concentrations.
            </li>
            <li>
              <b>Duration:</b> flames may burn longer,
              because weaker buoyancy reduces the
              airflow that can extinguish them.
            </li>
            <li>
              <b>Blue flames:</b> cool blue flames can
              produce harmful gases such as carbon
              monoxide and formaldehyde (FM2).
            </li>
          </ul>
          <h4>Lunar impact</h4>
          <Formula note="Buoyant airflow is about 59% slower than on Earth.">
            v_Moon / v_Earth = √(1/6) ≈ 0.41
          </Formula>
          <Formula note="The Grashof number drops to about 16.7% of its Earth value: much weaker buoyancy-driven convection.">
            Gr_Moon / Gr_Earth = 1/6 ≈ 0.167
          </Formula>
          <p>
            The Grashof number (Gr) is a dimensionless
            number comparing buoyancy-driven airflow
            with viscous forces. In other words, it
            describes how strongly hot gases rise
            because of gravity.
          </p>
          <Formula note="Scaling relationships for buoyancy-driven combustion.">
            v ∝ √( g_Moon · L · Δρ / ρ ) {'  '} L_Moon ∝
            ( Q² / g_Moon )^(1/5)
          </Formula>
        </section>

        <section id="mars">
          <h3>Fire behavior on Mars</h3>
          <Formula note="Rising combustion gases move at 62% of Earth's speed: faster than on the Moon (41%), slower than on Earth (100%).">
            Buoyant gas velocity: v_b ∝ √( g · L · ΔT /
            T₀ ) → √0.38 ≈ 0.62
          </Formula>
          <Formula note="Because Gr ∝ g, Mars is 0.38× Earth: about 2.6× smaller than Earth and 2.3× larger than the Moon.">
            Gr = g · β · (T_f − T_∞) · L³ / ν²
          </Formula>
          <p>
            <b>Comparison:</b> a Martian flame is
            moderately stretched upward into an
            intermediate teardrop, shorter and wider
            than a tall Earth flame but more elongated
            than a stubby lunar flame.
          </p>
          <Formula note="With g = 3.71 m/s², the upward buoyant pull is reduced by 62% compared with Earth.">
            Navier–Stokes buoyant force per unit volume:
            F_b = (ρ − ρ_∞) · g
          </Formula>
          <p>
            <b>Combustion effect:</b> slower convective
            cooling and a weaker upward draft keep heat
            near the fuel surface for longer. In
            oxygen-enriched habitat atmospheres (often
            about 26–34% O₂ in spacecraft and habitat
            designs), materials on Mars can ignite more
            easily and burn differently than standard
            Earth fire codes predict.
          </p>

          <h4>Gravity scaling at a glance</h4>
          <div className="rx-table-wrap">
            <table className="rx-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Gravity</th>
                  <th>Buoyant velocity (∝ √g)</th>
                  <th>Grashof number (∝ g)</th>
                </tr>
              </thead>
              <tbody>
                {GRAVITY_TABLE.map((r) => (
                  <tr key={r.place}>
                    <td>{r.place}</td>
                    <td>{r.g}</td>
                    <td>
                      <Bar value={r.velocity} />{' '}
                      {(r.velocity * 100).toFixed(0)}%
                    </td>
                    <td>
                      <Bar value={r.grashof} />{' '}
                      {(r.grashof * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="rx-small">
            Percentages are relative to Earth, computed
            from the scaling laws above.
          </p>
        </section>

        <section id="risks">
          <h3>Fire risks on board</h3>
          <p>
            Since flames behave differently under each
            gravitational condition, a single solution
            that works everywhere is hard to build.
            These differences create additional fire
            risks aboard spacecraft, stations, lunar and
            Mars bases and pressurized rovers.
            Electrical equipment, power systems and
            other heat sources also create ignition
            hazards in enclosed environments. Different
            causes involve different reactions and
            energy transformations, so each may need its
            own solution.
          </p>
          <div className="rx-cards">
            {RISKS.map((r) => (
              <div className="rx-card" key={r.title}>
                <h4>{r.title}</h4>
                <p>{r.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="solutions">
          <h3>
            From challenges to solutions: safer fires in
            space
          </h3>

          <Solution
            n="1"
            title="Heat-powered warning and automatic power cut-off"
          >
            <p>
              Since energy is conserved, thermoelectric
              materials could capture some of the heat
              produced by overheating wires and convert
              the temperature difference into electrical
              energy. That energy would power a warning
              system. Once overheating is detected, the
              system raises an alarm and a circuit
              breaker disconnects the supply, preventing
              further heating.
            </p>
          </Solution>
          <Solution
            n="2"
            title="Smart fuel containment and local oxygen displacement"
          >
            <p>
              Containment systems detect leaks and
              automatically seal damaged pipes or
              containers. Localized oxygen displacement
              replaces some of the oxygen around the
              leak with an inert gas to prevent
              combustion.
            </p>
          </Solution>
          <Solution
            n="3"
            title="Phase-change materials around batteries"
          >
            <p>
              These materials absorb large amounts of
              heat as they change from solid to liquid,
              limiting temperature rise. Individual
              cells could also be isolated automatically
              when abnormal temperatures are detected,
              stopping thermal runaway from spreading.
            </p>
          </Solution>
          <Solution
            n="4"
            title="Localized oxygen-control systems"
          >
            <p>
              Monitor oxygen concentration in different
              areas of the spacecraft. If levels become
              dangerously high, regulate the supply and
              release inert gas locally, without
              changing oxygen levels across the whole
              spacecraft.
            </p>
          </Solution>
          <Solution
            n="5"
            title="Heat pipes and liquid cooling"
          >
            <p>
              Instead of letting heat accumulate in
              electronics, transport it to radiators
              where it is released into space.
            </p>
          </Solution>

          <Solution
            n="6"
            title="Automatic evacuation system (pressure and oxygen control)"
          >
            <p>
              A system that continuously monitors and
              controls pressure and oxygen levels. By
              adjusting cabin pressure gradually and
              regulating oxygen, it prepares the cabin
              for emergency evacuation while reducing
              the pressure difference across the exit
              door, so the door is safer and easier to
              open. It would use pressure sensors and
              automatic regulation.
            </p>
            <div className="rx-formulas">
              <Formula note="P = pressure, V = volume, n = moles of gas, R = gas constant, T = absolute temperature (K)">
                PV = nRT
              </Formula>
              <Formula note="X(O₂) = oxygen fraction, P(total) = total cabin pressure">
                P(O₂) = X(O₂) × P(total)
              </Formula>
              <Formula note="F = force on the door (N), ΔP = pressure difference (Pa), A = door area (m²)">
                F = ΔP × A
              </Formula>
            </div>
            <p>
              <b>Important:</b> the system must equalize
              pressure across the door before it opens,
              and oxygen levels must stay safe for the
              crew. If oxygen needs to be reduced
              significantly, astronauts could use
              emergency breathing systems built into
              their suits or vests.
            </p>
            <p className="rx-small">
              A very simplified example of the control
              logic:
            </p>
            <pre className="rx-code">{`target_pressure = 75.0  # example target in kPa
cabin_pressure = 85.0

while abs(cabin_pressure - target_pressure) > 0.5:
    if cabin_pressure > target_pressure:
        print("Releasing excess gas")
        cabin_pressure -= 0.5
    else:
        print("Adding gas")
        cabin_pressure += 0.5
    print("Cabin pressure:", cabin_pressure, "kPa")

print("Target pressure reached.")`}</pre>
          </Solution>

          <Solution
            n="7"
            title="Wave-detection and automatic fire-suppression system"
          >
            <p>
              Infrared and optical sensors inside
              pressurized rover cabins detect the heat
              radiation and light from a fire. The
              system locates the fire and activates a
              pressurized device that directs a suitable
              extinguishing agent at the flames. Earth
              systems cannot simply be transferred: in
              reduced gravity, water droplets may float
              instead of falling, and without normal
              convection heat and smoke spread
              differently. Fluid and gas behavior must
              be studied and Earth-based equations
              adjusted.
            </p>
            <div className="rx-formulas">
              <Formula note="Bernoulli: pressure and velocity needed to direct the agent at the fire">
                P + ½ρv² + ρgh = constant
              </Formula>
              <Formula note="Volume flow rate (A = nozzle area, v = fluid velocity)">
                Q = A × v
              </Formula>
              <Formula note="Heat transfer by convection between flames, surfaces and gases">
                Q = h × A × (T_surface − T_fluid)
              </Formula>
              <Formula note="Radiation intensity, point source radiating uniformly">
                I = P / (4πr²)
              </Formula>
            </div>
            <p>
              <b>What is different:</b> rather than
              assuming fire, smoke and extinguishing
              agents behave as on Earth, the system is
              designed around their actual behavior in a
              pressurized, reduced-gravity environment.
            </p>
          </Solution>

          <Solution
            n="8"
            title="Electrostatic fire-particle collector"
          >
            <p>
              An electrically charged plate near the
              fire uses an electric field to attract
              charged smoke particles into a collection
              chamber, limiting how far smoke spreads
              through the rover. On Earth smoke rises by
              buoyancy; in microgravity that movement is
              greatly reduced, so an electric field
              offers another way to control charged
              particles without relying on gravity.
            </p>
            <p className="rx-limit">
              <b>Limitation:</b> not all smoke particles
              are charged, and an electric field neither
              attracts neutral gases nor extinguishes
              flames. The system needs an ionization
              stage to charge particles first. It would
              supplement fire suppression, not replace
              it.
            </p>
          </Solution>

          <Solution
            n="9"
            title="Adaptive fine-water-mist suppression for Earth, Moon and Mars"
          >
            <p>
              Inspired by NASA's research on
              firefighting in space, a system releasing
              very small water droplets that absorb
              heat, cool burning materials and reduce
              combustion. Because gravity, pressure and
              oxygen concentration differ between Earth,
              the Moon and Mars, droplets behave
              differently in each. Sensors monitor these
              conditions and automatically adjust
              droplet size, spray pressure and flow
              rate, so one adaptable technology works in
              all three. A portable mist extinguisher
              could serve pressurized habitats on Earth,
              the Moon and Mars, applying the same
              principles of heat absorption and
              evaporation under different operating
              conditions.
            </p>
            <p>
              The extinguisher adjusts nozzle pressure
              and water flow using the equations below.
              It adapts to local pressure, gravity and
              airflow to produce an effective mist, and
              works similarly on Earth, Mars and the
              Moon by adjusting the formula to the
              properties of each environment.
            </p>
            <div className="rx-formulas">
              <Formula note="m = mass of water, c = specific heat capacity, ΔT = temperature change">
                Heat absorbed: Q = m · c · ΔT
              </Formula>
              <Formula note="ṁ = mass flow rate, ρ = water density, A = nozzle area, v = fluid velocity">
                Water flow rate: ṁ = ρ · A · v
              </Formula>
              <Formula note="Bernoulli's equation: sets the nozzle pressure for a given exit velocity">
                P + ½ρv² + ρgh = constant
              </Formula>
            </div>
            <p className="rx-small">
              Water pressure at 1 m depth for each
              location (P = ρ·g·h):
            </p>
            <pre className="rx-code">{`water_density = 1000  # kg/m³
height = 1            # meters

gravity = {"Earth": 9.81, "Moon": 1.62, "Mars": 3.71}

for planet, g in gravity.items():
    pressure = water_density * g * height
    print(f"{planet}: {pressure:.0f} Pa")`}</pre>
          </Solution>

          <Solution
            n="10"
            title="Fire-resistant emergency shelter and materials"
          >
            <p>
              Small sealed safety compartments inside
              habitats and rovers. If a fire becomes
              uncontrollable, the crew enters a
              compartment with an independent oxygen
              supply, temperature control and
              fire-resistant materials until the fire is
              contained. Ceramic fibers and intumescent
              coatings, combined with activated-carbon
              and zeolite filters, slow combustion, stop
              heat spreading and remove toxic gases and
              particles from the air.
            </p>
          </Solution>
        </section>

        <section id="conclusion">
          <h3>Conclusion</h3>
          <p>
            Although the time available was limited,
            this work explores several approaches to
            fire safety in space habitats and rovers:
            combustion and heat transfer, water-mist
            extinguishing, fire-resistant materials and
            toxic-gas filtration. They are a starting
            point. With further experimentation, testing
            under different gravitational and
            atmospheric conditions and more precise
            physical models, these concepts could become
            effective, adaptable systems.
          </p>
          <blockquote className="rx-quote">
            What if the solution to fire suppression
            already exists in nature, but we have not
            yet discovered how to use it? Could there be
            undiscovered compounds or materials capable
            of extinguishing fires directly without
            producing harmful effects on humans? Could
            we develop a system that controls combustion
            at the molecular level rather than simply
            fighting its consequences?
            <footer>
              Every discovery begins with a question,
              and every question brings us one step
              closer to a solution.
            </footer>
          </blockquote>
        </section>
      </article>
    </div>
  );
}
