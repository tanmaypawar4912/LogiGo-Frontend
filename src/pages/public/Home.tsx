import { useState, type CSSProperties } from "react";

import { Link } from "react-router";

import {

  ArrowRight,

  BadgeCheck,

  CheckCircle2,

  Clock3,

  Menu,

  Package,

  MapPin,

  Route,

  ShieldCheck,

  Truck,

  Wallet,

  X,

  Zap,

} from "lucide-react";



import truckImage from "../../assets/logigo-truck.webp";

import "./Home.css";



function TruckScene({ compact = false }: { compact?: boolean }) {

  return (

    <div

      className={`lg-truck-scene${compact ? " lg-truck-scene--compact" : ""}`}

      aria-label="LogiGo delivery truck illustration"

    >

      <div className="lg-scene-glow" aria-hidden="true" />

      <div className="lg-scene-label">

        <span className="lg-live-dot" />

        SMARTER LOGISTICS

      </div>



      <div className="lg-route-tag lg-pickup-tag">

        <span className="lg-tag-icon lg-tag-green"><MapPin size={17} /></span>

        <span><small>PICKUP</small><strong>Starting point</strong></span>

      </div>



      <div className="lg-route-tag lg-drop-tag">

        <span className="lg-tag-icon lg-tag-orange"><MapPin size={17} /></span>

        <span><small>DESTINATION</small><strong>Drop-off</strong></span>

      </div>



      <svg className="lg-route-art" viewBox="0 0 640 300" preserveAspectRatio="none" aria-hidden="true">

        <path className="lg-route-shadow" d="M-25 160 C70 68 145 245 250 170 S380 82 462 170 S570 225 665 104" />

        <path className="lg-route-line" d="M-25 160 C70 68 145 245 250 170 S380 82 462 170 S570 225 665 104" />

      </svg>



      <div className="lg-truck-motion" aria-hidden="true">

        <img className="lg-real-truck" src={truckImage} alt="" />

      </div>



      <div className="lg-road-base" aria-hidden="true">

        <div className="lg-road-dashes" />

      </div>



      <div className="lg-delivery-float">

        <div className="lg-float-icon"><ShieldCheck size={19} /></div>

        <div className="lg-float-copy">

          <span>THE LOGIGO WAY</span>

          <strong>Simple. Clear. Reliable.</strong>

          <div className="lg-float-track"><span /></div>

        </div>

        <CheckCircle2 className="lg-float-check" size={18} />

      </div>



      <div className="lg-scene-bottom">

        <span><span className="lg-bottom-dot" /> Delivery made simpler</span>

        <span>Pickup <ArrowRight size={13} /> Destination</span>

      </div>

    </div>

  );

}



const services = [

  {

    title: "Mini Truck",

    category: "SMALL MOVES",

    description: "A practical choice for boxes, small household moves and local deliveries.",

    icon: Package,

    className: "lg-service-orange",

  },

  {

    title: "Pickup Truck",

    category: "BUSINESS DELIVERIES",

    description: "Move furniture, business supplies and medium-sized loads with ease.",

    icon: Truck,

    className: "lg-service-blue",

  },

  {

    title: "Large Truck",

    category: "HEAVY TRANSPORT",

    description: "For larger consignments and bulk transportation requirements.",

    icon: Route,

    className: "lg-service-green",

  },

];



const benefits = [

  {

    title: "Transparent estimates",

    description: "Review the estimated price before you confirm your booking.",

    icon: Wallet,

    className: "lg-benefit-icon-orange",

  },

  {

    title: "Clear delivery updates",

    description: "Follow booking progress from assignment through to delivery.",

    icon: Route,

    className: "lg-benefit-icon-blue",

  },

  {

    title: "Vehicles for your needs",

    description: "Choose a suitable vehicle for the size and weight of your load.",

    icon: Clock3,

    className: "lg-benefit-icon-green",

  },

];



function Home() {

  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);



  return (

    <div className="lg-home">
      <a className="lg-skip-link" href="#main-content">Skip to main content</a>

      <div className="lg-announcement">

        <Zap size={14} aria-hidden="true" />

        <span>Smarter moves start here.</span>

        <span className="lg-announcement-divider" aria-hidden="true" />

        <span className="lg-announcement-extra">Book, move and deliver with LogiGo.</span>

      </div>



      <header className="lg-header">

        <div className="lg-header-inner">

          <Link to="/" className="lg-brand" onClick={closeMenu} aria-label="LogiGo home">

            <span className="lg-brand-mark"><Truck size={24} strokeWidth={2.2} /></span>

            <span className="lg-brand-copy">

              <strong>LogiGo</strong>

              <small>LOGISTICS, SIMPLIFIED</small>

            </span>

          </Link>



          <nav id="lg-main-nav" className={`lg-nav${menuOpen ? " lg-nav-open" : ""}`} aria-label="Main navigation">

            <a href="#services" onClick={closeMenu}>Services</a>

            <a href="#how-it-works" onClick={closeMenu}>How it works</a>

            <a href="#why-logigo" onClick={closeMenu}>Why LogiGo</a>

            <div className="lg-mobile-nav-actions">

              <Link to="/login" className="lg-mobile-login" onClick={closeMenu}>Log in</Link>

              <Link to="/customer/book" className="lg-btn lg-btn-primary" onClick={closeMenu}>

                Book a delivery <ArrowRight size={16} />

              </Link>

            </div>

          </nav>



          <div className="lg-header-actions">

            <Link to="/login" className="lg-login-link">Log in</Link>

            <Link to="/customer/book" className="lg-btn lg-btn-primary lg-nav-book">

              Book a delivery <ArrowRight size={16} />

            </Link>

          </div>



          <button

            type="button"

            className="lg-menu-toggle"

            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}

            aria-expanded={menuOpen}
            aria-controls="lg-main-nav"

            onClick={() => setMenuOpen((current) => !current)}

          >

            {menuOpen ? <X size={23} /> : <Menu size={23} />}

          </button>

        </div>

      </header>



      <main id="main-content">

        <section className="lg-hero">

          <div className="lg-hero-orb lg-hero-orb-one" aria-hidden="true" />

          <div className="lg-hero-orb lg-hero-orb-two" aria-hidden="true" />

          <div className="lg-container lg-hero-grid">

            <div className="lg-hero-copy">

              <div className="lg-eyebrow"><span className="lg-eyebrow-pulse" /> ON-DEMAND TRANSPORTATION</div>

              <h1>Move anything.<br /><span>Anywhere.</span></h1>

              <p className="lg-hero-description">

                From everyday deliveries to larger moves, get the right vehicle,

                review your estimated fare and follow your delivery journey with LogiGo.

              </p>

              <div className="lg-hero-actions">

                <Link to="/customer/book" className="lg-btn lg-btn-primary lg-btn-large">

                  Start booking <ArrowRight size={18} />

                </Link>

                <a href="#services" className="lg-btn lg-btn-secondary lg-btn-large">Explore services</a>

              </div>



              <div className="lg-trust-row">

                <div className="lg-trust-item">

                  <span className="lg-trust-icon"><CheckCircle2 size={17} /></span>

                  <span><strong>Simple booking</strong><small>Clear steps, no clutter</small></span>

                </div>

                <div className="lg-trust-item">

                  <span className="lg-trust-icon lg-trust-icon-green"><BadgeCheck size={17} /></span>

                  <span><strong>Fare transparency</strong><small>Know before you confirm</small></span>

                </div>

              </div>

            </div>



            <div className="lg-hero-visual">

              <TruckScene />

              <div className="lg-visual-caption">

                <span className="lg-caption-mark"><Route size={15} /></span>

                <span>Every delivery has a journey.</span>

                <ArrowRight size={15} className="lg-caption-arrow" />

              </div>

            </div>

          </div>

          <div className="lg-container lg-hero-bottom">

            <span className="lg-hero-bottom-rule" />

            <span>ONE PLATFORM. MULTIPLE WAYS TO MOVE.</span>

            <span className="lg-hero-bottom-rule" />

          </div>

        </section>



        <section className="lg-benefits-strip" id="why-logigo">

          <div className="lg-container lg-benefits-grid">

            {benefits.map((benefit) => {

              const Icon = benefit.icon;

              return (

                <article className="lg-benefit" key={benefit.title}>

                  <span className={`lg-benefit-icon ${benefit.className}`}><Icon size={21} /></span>

                  <span className="lg-benefit-copy">

                    <strong>{benefit.title}</strong>

                    <small>{benefit.description}</small>

                  </span>

                </article>

              );

            })}

          </div>

        </section>



        <section className="lg-section lg-services" id="services">

          <div className="lg-container">

            <div className="lg-section-heading">

              <div className="lg-heading-copy">

                <div className="lg-eyebrow"><span className="lg-eyebrow-pulse" /> FIND YOUR FIT</div>

                <h2>The right ride for<br className="lg-desktop-break" /> every kind of move.</h2>

                <p>Small parcels, home essentials or heavier loads. Choose a vehicle that fits your delivery.</p>

              </div>

              <Link to="/customer/book" className="lg-text-link">

                View booking options <ArrowRight size={16} />

              </Link>

            </div>



            <div className="lg-service-grid">

              {services.map((service, index) => {

                const Icon = service.icon;

                return (

                  <article

                    className="lg-service-card"

                    key={service.title}

                    style={{ "--service-index": index } as CSSProperties}

                  >

                    <div className="lg-service-card-top">

                      <span className={`lg-service-icon ${service.className}`}><Icon size={24} /></span>

                      <span className="lg-service-number">0{index + 1}</span>

                    </div>

                    <span className="lg-service-category">{service.category}</span>

                    <h3>{service.title}</h3>

                    <p>{service.description}</p>

                    <Link to="/customer/book" className="lg-service-link">

                      Choose this vehicle <ArrowRight size={16} />

                    </Link>

                  </article>

                );

              })}

            </div>



            <p className="lg-service-note">

              <ShieldCheck size={16} />

              Final vehicle options and rates are loaded from the live LogiGo catalog during booking.

            </p>

          </div>

        </section>



        <section className="lg-section lg-how" id="how-it-works">

          <div className="lg-container">

            <div className="lg-centered-heading">

              <div className="lg-eyebrow"><span className="lg-eyebrow-pulse" /> YOUR DELIVERY, MADE SIMPLE</div>

              <h2>Three steps.<br className="lg-mobile-break" /> <span>One smooth journey.</span></h2>

              <p>A clear process from entering your addresses to completing your delivery.</p>

            </div>



            <div className="lg-how-grid">

              <span className="lg-how-connector" aria-hidden="true" />

              <article className="lg-how-card">

                <div className="lg-how-card-head"><span className="lg-how-number">01</span><span className="lg-how-icon"><MapPin size={22} /></span></div>

                <h3>Set your route</h3>

                <p>Enter your pickup and drop-off locations and tell us what you need to move.</p>

              </article>

              <article className="lg-how-card">

                <div className="lg-how-card-head"><span className="lg-how-number">02</span><span className="lg-how-icon lg-how-icon-orange"><Truck size={22} /></span></div>

                <h3>Choose your vehicle</h3>

                <p>Compare suitable vehicle options and review the estimated fare before confirming.</p>

              </article>

              <article className="lg-how-card">

                <div className="lg-how-card-head"><span className="lg-how-number">03</span><span className="lg-how-icon lg-how-icon-green"><CheckCircle2 size={22} /></span></div>

                <h3>Follow your delivery</h3>

                <p>Follow booking status and view assigned driver details when available.</p>

              </article>

            </div>

          </div>

        </section>



        <section className="lg-container lg-final-cta">

          <div className="lg-cta-decoration lg-cta-decoration-one" aria-hidden="true" />

          <div className="lg-cta-decoration lg-cta-decoration-two" aria-hidden="true" />

          <div className="lg-cta-content">

            <span className="lg-cta-kicker"><Truck size={15} /> YOUR NEXT MOVE STARTS HERE</span>

            <h2>Ready to get<br /><span>things moving?</span></h2>

            <p>Set your route, find the right vehicle and plan your delivery with LogiGo.</p>

            <Link to="/customer/book" className="lg-btn lg-btn-white lg-btn-large">

              Book your delivery <ArrowRight size={18} />

            </Link>

          </div>

          <div className="lg-cta-truck"><TruckScene compact /></div>

        </section>

      </main>



      <footer className="lg-footer">

        <div className="lg-container">

          <div className="lg-footer-main">

            <Link to="/" className="lg-brand" aria-label="LogiGo home">

              <span className="lg-brand-mark"><Truck size={23} /></span>

              <span className="lg-brand-copy"><strong>LogiGo</strong><small>LOGISTICS, SIMPLIFIED</small></span>

            </Link>

            <p>Moving your world, one delivery at a time.</p>

            <div className="lg-footer-links">

              <a href="#services">Services</a>

              <a href="#how-it-works">How it works</a>

              <Link to="/login">Log in</Link>

              <Link to="/register">Create account</Link>

            </div>

          </div>

          <div className="lg-footer-bottom">

            <span>© {new Date().getFullYear()} LogiGo. All rights reserved.</span>

            <span>Built to keep your deliveries moving.</span>

          </div>

        </div>

      </footer>

    </div>

  );

}



export default Home;
