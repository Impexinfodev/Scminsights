"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Globe02Icon,
  UserGroupIcon,
  CheckmarkCircle02Icon,
  TargetIcon,
  BulbIcon,
  FavouriteIcon,
} from "@hugeicons/core-free-icons";
import Footer from "@/components/layout/Footer";

export default function AboutPageClient() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-linear-to-b from-blue-50/50 to-white border-b border-gray-100 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-600 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              About SCM INSIGHTS
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Empowering Global Trade with Intelligence
            </h1>
            <p className="text-gray-600 text-lg">
              We help businesses discover verified trade partners, analyze market trends,
              and make data-driven decisions in international commerce.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              At SCM INSIGHTS, we believe that access to accurate trade data should be
              available to businesses of all sizes. Our mission is to democratize global
              trade intelligence and help companies make smarter decisions.
            </p>
            <div className="space-y-4">
              {[
                { icon: TargetIcon, text: "Provide accurate, real-time trade data" },
                { icon: BulbIcon, text: "Deliver actionable market insights" },
                { icon: FavouriteIcon, text: "Support businesses in their growth journey" },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <HugeiconsIcon icon={item.icon} size={20} className="text-blue-600" />
                  </div>
                  <span className="text-gray-700">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=80"
                alt="Team"
                width={600}
                height={400}
                className="w-full h-auto"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "209+", label: "Countries Covered", icon: Globe02Icon },
              { value: "1M+", label: "Companies Listed", icon: UserGroupIcon },
              { value: "50M+", label: "Trade Records", icon: CheckmarkCircle02Icon },
              { value: "10K+", label: "Happy Clients", icon: FavouriteIcon },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <HugeiconsIcon icon={stat.icon} size={28} className="text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-gray-500 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            These core values guide everything we do at SCM INSIGHTS
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Accuracy",
              description: "We ensure 99.5% data accuracy through rigorous verification processes.",
              color: "blue",
            },
            {
              title: "Innovation",
              description: "We continuously improve our platform with cutting-edge technology.",
              color: "emerald",
            },
            {
              title: "Customer Focus",
              description: "Your success is our priority. We provide 24/7 dedicated support.",
              color: "amber",
            },
          ].map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg hover:border-blue-200 transition-all cursor-default"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
              <p className="text-gray-600">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
