"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, useInView, Variants } from "framer-motion";
import { useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Database01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  Globe02Icon,
  CheckmarkCircle02Icon,
  FlashIcon,
  UserShield01Icon,
  Search01Icon,
  AnalyticsUpIcon,
  BoatIcon,
  ContainerTruck01Icon,
} from "@hugeicons/core-free-icons";
import Footer from "@/components/layout/Footer";

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
} as Variants;

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

// Unsplash images
const images = {
  hero: "https://images.unsplash.com/photo-1578575437130-527eed3abbec",
  shipping: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=800&q=80",
  warehouse: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=80",
  globe: "https://images.unsplash.com/photo-1617952739760-1dcae19a1d93",
  analytics: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
  team: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80",
};

// Animated Section Component
function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function HomePageClient() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <div className="min-h-screen overflow-hidden bg-white relative">
      {/* Hero Section - 100vh */}
      <section ref={heroRef} className="relative h-screen flex items-center pt-24 overflow-hidden">
        {/* Background Image with Parallax */}
        <motion.div
          style={{ y: heroY, scale: heroScale }}
          className="absolute inset-0 z-0"
        >
          <Image
            src={images.hero}
            alt="Global Trade"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          {/* Enhanced overlays for better text readability */}
          <div className="absolute inset-0 bg-linear-to-r from-white/60 via-white/30 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-b from-white/40 via-transparent to-white/60" />
          <div className="absolute inset-0 bg-linear-to-t from-white/80 via-transparent to-white/30" />
        </motion.div>

        {/* Content */}
        <motion.div
          style={{ y: contentY, opacity: heroOpacity }}
          className="relative z-10 w-full"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid xl:grid-cols-2 gap-12 items-center">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
              >
                <motion.div variants={fadeInUp}>
                  <span className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-sm border border-emerald-200 shadow-lg shadow-emerald-100/50 mb-8">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-semibold text-gray-700">Trusted by 10,000+ businesses worldwide</span>
                  </span>
                </motion.div>

                <motion.h1
                  variants={fadeInUp}
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.08] mb-6"
                >
                  Global Trade
                  <br />
                  <span className="bg-linear-to-r from-blue-600 via-blue-700 to-indigo-600 bg-clip-text text-transparent">Intelligence Platform</span>
                </motion.h1>

                <motion.p
                  variants={fadeInUp}
                  className="text-lg text-gray-700 leading-relaxed mb-10 max-w-xl"
                >
                  Access verified buyer and supplier data from 209+ countries.
                  Make informed decisions with comprehensive trade analytics.
                </motion.p>

                <motion.div variants={fadeInUp} className="flex flex-wrap gap-4">
                  <Link
                    href="/buyers-directory"
                    className="group inline-flex items-center gap-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-7 rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    Get Started Free
                    <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    href="/buyer"
                    className="group inline-flex items-center gap-2.5 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 font-semibold py-4 px-7 rounded-xl border border-gray-200 hover:border-gray-300 shadow-lg shadow-gray-200/50 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <HugeiconsIcon icon={Search01Icon} size={18} />
                    Search Buyers
                  </Link>
                </motion.div>

                {/* Quick Stats */}
                <motion.div
                  variants={fadeInUp}
                  className="flex gap-8 sm:gap-12 mt-12 pt-8 border-t border-gray-200/60"
                >
                  {[
                    { value: "209+", label: "Countries" },
                    { value: "1M+", label: "Companies" },
                    { value: "50M+", label: "Records" },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                    >
                      <div className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{stat.value}</div>
                      <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              {/* Floating Cards */}
              <motion.div
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="hidden xl:block relative h-[500px]"
              >
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-0 right-0 w-64 bg-white/95 backdrop-blur-xl rounded-2xl p-5 shadow-xl shadow-gray-200/50 border border-gray-100"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-linear-to-br from-amber-100 to-amber-50 flex items-center justify-center shadow-sm">
                      <HugeiconsIcon icon={Globe02Icon} size={22} className="text-amber-600" />
                    </div>
                    <span className="font-semibold text-gray-900">Countries</span>
                  </div>
                  <div className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-1">209</div>
                  <div className="text-sm text-gray-500">Global coverage</div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute top-36 left-0 w-72 bg-white/95 backdrop-blur-xl rounded-2xl p-5 shadow-xl shadow-gray-200/50 border border-gray-100"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-linear-to-br from-blue-100 to-blue-50 flex items-center justify-center shadow-sm">
                      <HugeiconsIcon icon={BoatIcon} size={22} className="text-blue-600" />
                    </div>
                    <span className="font-semibold text-gray-900">Live Shipments</span>
                  </div>
                  <div className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-1">12,847</div>
                  <div className="text-sm text-gray-500">Active today</div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute bottom-10 right-10 w-60 bg-white/95 backdrop-blur-xl rounded-2xl p-5 shadow-xl shadow-gray-200/50 border border-gray-100"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-linear-to-br from-emerald-100 to-emerald-50 flex items-center justify-center shadow-sm">
                      <HugeiconsIcon icon={AnalyticsUpIcon} size={22} className="text-emerald-600" />
                    </div>
                    <span className="font-semibold text-gray-900">Trade Volume</span>
                  </div>
                  <div className="text-3xl font-bold text-emerald-600 mb-1">$2.4B</div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      12.5%
                    </span>
                    <span className="text-gray-500">vs last month</span>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-7 h-11 rounded-full border-2 border-gray-400/50 flex justify-center pt-2 backdrop-blur-sm bg-white/20"
          >
            <motion.div
              animate={{ opacity: [1, 0.3, 1], y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-3 rounded-full bg-gray-500"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="badge mb-4">Our Services</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Powerful tools to discover, analyze, and connect with trade partners worldwide.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Database01Icon,
                title: "Buyers Directory",
                description: "Comprehensive database of verified importers with IEC codes, contact details, and trade history.",
                href: "/buyers-directory",
                image: images.warehouse,
                color: "blue"
              },
              {
                icon: UserAdd01Icon,
                title: "Search Buyers",
                description: "Find buyers by country, HS code, product category, and trade volume. Real-time data updated daily.",
                href: "/buyer",
                image: images.analytics,
                color: "cyan"
              },
              {
                icon: UserGroupIcon,
                title: "Search Suppliers",
                description: "Discover verified exporters and manufacturers with detailed metrics and performance data.",
                href: "/supplier",
                image: images.shipping,
                color: "indigo"
              },
            ].map((feature, index) => (
              <AnimatedSection key={feature.title} delay={index * 0.1}>
                <Link href={feature.href} className="block group h-full">
                  <div className="h-full bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl">
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/20 to-transparent" />
                      <div className={`absolute bottom-4 left-4 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${feature.color === "blue" ? "bg-blue-600" :
                        feature.color === "cyan" ? "bg-cyan-600" :
                          "bg-indigo-600"
                        }`}>
                        <HugeiconsIcon icon={feature.icon} size={24} className="text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed mb-4">
                        {feature.description}
                      </p>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 group-hover:gap-3 transition-all">
                        Explore Now
                        <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                      </span>
                    </div>
                  </div>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Image Side */}
            <AnimatedSection>
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src={images.team}
                    alt="Our Team"
                    width={600}
                    height={400}
                    className="w-full h-auto"
                  />
                </div>

                {/* Floating stat */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -bottom-6 -right-6 lg:right-auto lg:-left-6 card-elevated p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} className="text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">98%</div>
                      <div className="text-sm text-gray-500">Satisfaction Rate</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </AnimatedSection>

            {/* Content Side */}
            <AnimatedSection delay={0.2}>
              <span className="badge mb-4">Why Choose Us</span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Built for Global Trade Excellence
              </h2>
              <p className="text-gray-600 text-lg mb-10">
                We provide the most comprehensive and accurate trade intelligence platform,
                helping businesses make data-driven decisions in international commerce.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: Globe02Icon, title: "Global Coverage", desc: "209+ countries", color: "blue" },
                  { icon: UserShield01Icon, title: "Verified Data", desc: "99.5% accuracy", color: "emerald" },
                  { icon: FlashIcon, title: "Real-Time Updates", desc: "Updated daily", color: "amber" },
                  { icon: ContainerTruck01Icon, title: "Trade Analytics", desc: "Deep insights", color: "indigo" },
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 border border-gray-100 rounded-xl p-5 hover:bg-gray-100/50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${item.color === "blue" ? "bg-blue-100 text-blue-600" :
                      item.color === "emerald" ? "bg-emerald-100 text-emerald-600" :
                        item.color === "amber" ? "bg-amber-100 text-amber-600" :
                          "bg-indigo-100 text-indigo-600"
                      }`}>
                      <HugeiconsIcon icon={item.icon} size={20} />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Countries Coverage Section */}
      <section className="py-24 lg:py-32 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="badge mb-4">Global Reach</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Coverage Across 209+ Countries
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Access trade data from every major trading nation. Our platform covers all continents with comprehensive import/export intelligence.
            </p>
          </AnimatedSection>

          {/* Countries Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-12">
            {[
              { name: "United States", code: "US", trades: "2.5M+" },
              { name: "China", code: "CN", trades: "3.2M+" },
              { name: "Germany", code: "DE", trades: "1.8M+" },
              { name: "Japan", code: "JP", trades: "1.4M+" },
              { name: "United Kingdom", code: "GB", trades: "1.2M+" },
              { name: "India", code: "IN", trades: "2.1M+" },
              { name: "France", code: "FR", trades: "980K+" },
              { name: "Italy", code: "IT", trades: "870K+" },
              { name: "South Korea", code: "KR", trades: "1.1M+" },
              { name: "Canada", code: "CA", trades: "750K+" },
              { name: "Netherlands", code: "NL", trades: "920K+" },
              { name: "Australia", code: "AU", trades: "680K+" },
            ].map((country, index) => (
              <motion.div
                key={country.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl p-4 border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 text-center group"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
                  <Image
                    src={`https://flagcdn.com/w80/${country.code.toLowerCase()}.png`}
                    alt={`${country.name} flag`}
                    width={80}
                    height={60}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">{country.name}</h4>
                <p className="text-xs text-blue-600 font-medium">{country.trades} records</p>
              </motion.div>
            ))}
          </div>

          {/* Stats Row */}
          <AnimatedSection className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "209+", label: "Countries Covered", icon: Globe02Icon },
              { value: "50M+", label: "Trade Records", icon: Database01Icon },
              { value: "1M+", label: "Companies", icon: UserGroupIcon },
              { value: "24/7", label: "Data Updates", icon: FlashIcon },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 text-center hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <HugeiconsIcon icon={stat.icon} size={24} className="text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="badge mb-4">Testimonials</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              See what our clients say about their experience with SCM INSIGHTS platform.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "SCM INSIGHTS transformed how we identify new suppliers. The data accuracy is impressive, and we've expanded into 5 new markets within months.",
                author: "Sarah Chen",
                role: "Head of Procurement",
                company: "Global Trade Corp",
                image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
              },
              {
                quote: "The buyer intelligence features helped us understand market demand better. Our export revenue increased by 40% after using this platform.",
                author: "Rajesh Kumar",
                role: "Export Manager",
                company: "Textile Industries Ltd",
                image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
              },
              {
                quote: "Real-time data updates and comprehensive country coverage make SCM INSIGHTS indispensable for our international trade operations.",
                author: "Michael Fischer",
                role: "Director of Operations",
                company: "EuroTrade GmbH",
                image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
              },
            ].map((testimonial, index) => (
              <AnimatedSection key={testimonial.author} delay={index * 0.1}>
                <div className="bg-gray-50 rounded-2xl p-6 h-full border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300">
                  {/* Quote Icon */}
                  <div className="text-blue-500 mb-4">
                    <svg className="w-8 h-8 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </div>

                  {/* Quote */}
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.author}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">{testimonial.author}</h4>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                      <p className="text-xs text-blue-600 font-medium">{testimonial.company}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Trust Indicators */}
          <AnimatedSection className="mt-16 text-center">
            <p className="text-sm text-gray-500 mb-6">Trusted by 10,000+ companies worldwide</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              {["Fortune 500", "ISO Certified", "GDPR Compliant", "24/7 Support", "99.9% Uptime"].map((badge) => (
                <div key={badge} className="flex items-center gap-2 text-gray-600">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-blue-500" />
                  <span className="text-sm font-medium">{badge}</span>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <Image src={images.globe} alt="" fill sizes="100vw" className="object-cover" />
          {/* Dark overlay for better text contrast */}
          <div className="absolute inset-0 bg-linear-to-br from-gray-900/85 via-blue-900/80 to-indigo-900/85" />
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8"
            >
              <HugeiconsIcon icon={FlashIcon} size={16} className="text-amber-400" />
              <span className="text-sm font-medium text-white/90">Start your free trial today</span>
            </motion.div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Ready to Transform Your
              <br />
              <span className="bg-linear-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">Trade Operations?</span>
            </h2>
            <p className="text-lg text-blue-100/90 mb-12 max-w-2xl mx-auto leading-relaxed">
              Join thousands of businesses already using SCM INSIGHTS to discover
              verified trade partners and grow their global operations.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2.5 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-8 rounded-xl shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30"
              >
                Start Free Trial
                <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold py-4 px-8 rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300 hover:-translate-y-1"
              >
                Contact Sales
              </Link>
            </div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-12 pt-8 border-t border-white/10"
            >
              <p className="text-sm text-blue-200/70 mb-4">Trusted by leading companies worldwide</p>
              <div className="flex flex-wrap justify-center items-center gap-6">
                {["No credit card required", "14-day free trial", "Cancel anytime"].map((item, index) => (
                  <div key={item} className="flex items-center gap-2 text-white/80">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-emerald-400" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}
