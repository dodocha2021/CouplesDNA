import React from 'react';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="min-h-[400px] md:min-h-[600px] flex items-center justify-center transition-all duration-200 hover:shadow-lg hover:scale-[1.005]">
            <CardContent className="w-full max-w-3xl mx-auto space-y-10 py-16 px-6 md:px-12">
              {/* H1 Title Placeholder - Largest */}
              <div className="h-24 md:h-32 bg-muted/40 backdrop-blur-sm rounded-md flex items-center justify-center">
                <span className="text-xl md:text-2xl text-muted-foreground font-semibold">Heading</span>
              </div>

              {/* Subtitle Placeholder - Medium */}
              <div className="h-20 md:h-24 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                <span className="text-base md:text-lg text-muted-foreground font-medium">Subheading</span>
              </div>

              {/* CTA Button Group Placeholder */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <div className="h-14 w-full sm:w-52 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                  <span className="text-sm md:text-base text-muted-foreground font-medium">Primary CTA</span>
                </div>
                <div className="h-14 w-full sm:w-52 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                  <span className="text-sm md:text-base text-muted-foreground font-medium">Secondary CTA</span>
                </div>
              </div>

              {/* Trust Indicators Placeholder - Smallest */}
              <div className="h-12 bg-muted/20 backdrop-blur-sm rounded-md flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Trust Indicators</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground">Features</h2>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <Card key={index} className="transition-all duration-200 hover:shadow-lg hover:scale-[1.03]">
                <CardHeader className="space-y-4">
                  {/* Icon Placeholder */}
                  <div className="w-14 h-14 bg-muted/40 backdrop-blur-sm rounded-md flex items-center justify-center mx-auto">
                    <span className="text-xs text-muted-foreground font-medium">Icon</span>
                  </div>

                  {/* Title Placeholder - Larger, more prominent */}
                  <div className="h-10 bg-muted/40 backdrop-blur-sm rounded-md flex items-center justify-center">
                    <span className="text-sm md:text-base text-muted-foreground font-semibold">Feature Title</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Description Placeholder - Smaller */}
                  <div className="h-24 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Description</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 px-4 bg-muted/10">
        <div className="max-w-7xl mx-auto">
          {/* Section Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground">How It Works</h2>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((step) => (
              <Card key={step} className="transition-all duration-200 hover:shadow-lg hover:scale-[1.03]">
                <CardHeader className="space-y-5">
                  {/* Step Number Badge - Gray instead of primary */}
                  <div className="w-14 h-14 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                    {step}
                  </div>

                  {/* Step Title Placeholder - Larger */}
                  <div className="h-10 bg-muted/40 backdrop-blur-sm rounded-md flex items-center justify-center">
                    <span className="text-sm md:text-base text-muted-foreground font-semibold">Step Title</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Step Description Placeholder */}
                  <div className="h-28 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Step Description</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground">Testimonials</h2>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((index) => (
              <Card key={index} className="transition-all duration-200 hover:shadow-lg hover:scale-[1.03]">
                <CardHeader className="space-y-4">
                  {/* Avatar Placeholder */}
                  <div className="w-16 h-16 bg-muted/40 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto">
                    <span className="text-xs text-muted-foreground font-medium">Avatar</span>
                  </div>

                  {/* Name Placeholder - Larger, more prominent */}
                  <div className="h-8 bg-muted/40 backdrop-blur-sm rounded-md flex items-center justify-center">
                    <span className="text-sm md:text-base text-muted-foreground font-semibold">Name</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Testimonial Content Placeholder - Smaller */}
                  <div className="h-36 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Testimonial</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section - Redesigned with gray theme */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="border-2 border-border bg-muted/30 transition-all duration-200 hover:shadow-lg hover:border-foreground/20">
            <CardContent className="py-16 md:py-20 px-6 md:px-12 space-y-10">
              {/* CTA Title Placeholder - Large */}
              <div className="h-20 md:h-24 bg-muted/50 backdrop-blur-sm rounded-md flex items-center justify-center">
                <span className="text-xl md:text-2xl text-foreground font-bold">CTA Heading</span>
              </div>

              {/* CTA Subtitle Placeholder - Medium */}
              <div className="h-16 bg-muted/40 backdrop-blur-sm rounded-md flex items-center justify-center">
                <span className="text-base md:text-lg text-muted-foreground font-medium">CTA Subheading</span>
              </div>

              {/* CTA Button Group Placeholder */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <div className="h-14 w-full sm:w-52 bg-muted/50 backdrop-blur-sm rounded-md flex items-center justify-center border-2 border-border">
                  <span className="text-sm md:text-base text-foreground font-medium">Button</span>
                </div>
                <div className="h-14 w-full sm:w-52 bg-muted/50 backdrop-blur-sm rounded-md flex items-center justify-center border-2 border-border">
                  <span className="text-sm md:text-base text-foreground font-medium">Button</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/20 border-t border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4 text-foreground">CouplesDNA</h3>
            <p className="text-base text-muted-foreground mb-8 max-w-2xl mx-auto">
              Helping couples build stronger, more connected relationships through the power of conversation analysis.
            </p>
            <div className="flex justify-center space-x-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors font-medium">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors font-medium">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors font-medium">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
