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
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="min-h-[500px] flex items-center justify-center transition-all duration-200 hover:shadow-md hover:scale-[1.01]">
            <CardContent className="w-full max-w-3xl mx-auto space-y-8 py-16 px-6">
              {/* H1 Title Placeholder */}
              <div className="h-20 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                <span className="text-sm text-muted-foreground font-medium">Heading</span>
              </div>

              {/* Subtitle Placeholder */}
              <div className="h-16 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                <span className="text-sm text-muted-foreground font-medium">Subheading</span>
              </div>

              {/* CTA Button Group Placeholder */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <div className="h-12 w-full sm:w-48 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                  <span className="text-sm text-muted-foreground font-medium">Primary CTA</span>
                </div>
                <div className="h-12 w-full sm:w-48 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                  <span className="text-sm text-muted-foreground font-medium">Secondary CTA</span>
                </div>
              </div>

              {/* Trust Indicators Placeholder */}
              <div className="h-10 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                <span className="text-sm text-muted-foreground font-medium">Trust Indicators</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Title */}
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Features</h2>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <Card key={index} className="transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
                <CardHeader className="space-y-4">
                  {/* Icon Placeholder */}
                  <div className="w-12 h-12 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center mx-auto">
                    <span className="text-xs text-muted-foreground font-medium">Icon</span>
                  </div>

                  {/* Title Placeholder */}
                  <div className="h-8 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-medium">Feature Title</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Description Placeholder */}
                  <div className="h-20 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-medium">Description</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-20 px-4 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          {/* Section Title */}
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">How It Works</h2>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((step) => (
              <Card key={step} className="transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
                <CardHeader className="space-y-4">
                  {/* Step Number Badge */}
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                    {step}
                  </div>

                  {/* Step Title Placeholder */}
                  <div className="h-8 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-medium">Step Title</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Step Description Placeholder */}
                  <div className="h-24 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-medium">Step Description</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Title */}
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Testimonials</h2>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((index) => (
              <Card key={index} className="transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
                <CardHeader className="space-y-4">
                  {/* Avatar Placeholder */}
                  <div className="w-16 h-16 bg-muted/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto">
                    <span className="text-xs text-muted-foreground font-medium">Avatar</span>
                  </div>

                  {/* Name Placeholder */}
                  <div className="h-6 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-medium">Name</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Testimonial Content Placeholder */}
                  <div className="h-32 bg-muted/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-medium">Testimonial</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-primary text-primary-foreground transition-all duration-200 hover:shadow-md hover:scale-[1.01]">
            <CardContent className="py-16 px-6 space-y-8">
              {/* CTA Title Placeholder */}
              <div className="h-16 bg-primary-foreground/10 backdrop-blur-sm rounded-md flex items-center justify-center">
                <span className="text-sm font-medium">CTA Heading</span>
              </div>

              {/* CTA Subtitle Placeholder */}
              <div className="h-12 bg-primary-foreground/10 backdrop-blur-sm rounded-md flex items-center justify-center">
                <span className="text-sm font-medium">CTA Subheading</span>
              </div>

              {/* CTA Button Group Placeholder */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <div className="h-12 w-full sm:w-48 bg-primary-foreground/10 backdrop-blur-sm rounded-md flex items-center justify-center">
                  <span className="text-sm font-medium">Button</span>
                </div>
                <div className="h-12 w-full sm:w-48 bg-primary-foreground/10 backdrop-blur-sm rounded-md flex items-center justify-center">
                  <span className="text-sm font-medium">Button</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2 text-foreground">CouplesDNA</h3>
            <p className="text-muted-foreground mb-6">
              Helping couples build stronger, more connected relationships through the power of conversation analysis.
            </p>
            <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
