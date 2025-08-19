import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowBigRightIcon } from 'lucide-react'
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion"
import { cn } from "../src/lib/utils"
import { Mockup, MockupFrame } from "@/components/ui/mockup"

// 高级 HoverCard 组件
const AdvancedTooltip = ({ children, content, className }) => {
  const [isOpen, setOpen] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const springConfig = { stiffness: 100, damping: 15 }
  const x = useMotionValue(0)
  const translateX = useSpring(x, springConfig)

  const handleMouseMove = (event) => {
    const targetRect = event.target.getBoundingClientRect()
    const eventOffsetX = event.clientX - targetRect.left
    const offsetFromCenter = (eventOffsetX - targetRect.width / 2) / 2
    x.set(offsetFromCenter)
  }

  if (!isMounted) {
    return <span className={cn("text-black dark:text-white", className)}>{children}</span>
  }

  return (
    <HoverCardPrimitive.Root
      openDelay={50}
      closeDelay={100}
      onOpenChange={(open) => {
        setOpen(open)
      }}
    >
      <HoverCardPrimitive.Trigger
        onMouseMove={handleMouseMove}
        className={cn("text-black dark:text-white cursor-pointer", className)}
      >
        {children}
      </HoverCardPrimitive.Trigger>

      <HoverCardPrimitive.Content
        className="[transform-origin:var(--radix-hover-card-content-transform-origin)]"
        side="top"
        align="center"
        sideOffset={10}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.6 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                },
              }}
              exit={{ opacity: 0, y: 20, scale: 0.6 }}
              className="shadow-xl rounded-xl"
              style={{
                x: translateX,
              }}
            >
              <div className="block p-4 bg-white text-gray-900 border border-gray-200 shadow rounded-xl max-w-sm">
                <div className="text-sm leading-relaxed">{content}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </HoverCardPrimitive.Content>
    </HoverCardPrimitive.Root>
  )
}

const Hero = React.forwardRef(({ className, title, subtitle, eyebrow, ctaText, ctaLink, mockupImage, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col items-center bg-[#f3f1ea]", className)}
      {...props}
    >
      {eyebrow && (
        <p 
          className="font-instrument-sans uppercase tracking-[0.51em] leading-[133%] text-center text-[19px] mt-[249px] mb-8 text-[#000000] animate-appear opacity-0"
        >
          {eyebrow}
        </p>
      )}

      <h1 
        className="text-[64px] leading-[83px] text-center px-4 lg:px-[314px] text-[#000000] animate-appear opacity-0 delay-100"
      >
        {title}
      </h1>

      {subtitle && (
        <p 
          className="text-[28px] text-center font-instrument-sans font-light px-4 lg:px-[314px] mt-[25px] mb-[48px] leading-[133%] text-[#000000] animate-appear opacity-0 delay-300"
        >
          {subtitle}
        </p>
      )}

      {ctaText && ctaLink && (
        <Link href={ctaLink}>
          <div 
            className="inline-flex items-center bg-[#000000] text-[#ffffff] rounded-[10px] hover:bg-[#000000]/90 transition-colors font-instrument-sans w-[227px] h-[49px] animate-appear opacity-0 delay-500"
          >
            <div className="flex items-center justify-between w-full pl-[22px] pr-[17px]">
              <span className="text-[19px] whitespace-nowrap">{ctaText}</span>
              <div className="flex items-center gap-[14px]">
                <div className="w-[36px] h-[15px] relative flex items-center justify-center">
                  <ArrowBigRightIcon className="w-6 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {mockupImage && (
        <div className="mt-20 w-full relative animate-appear opacity-0 delay-700">
          <MockupFrame>
            <Mockup type="responsive">
              <Image
                src={mockupImage.src}
                alt={mockupImage.alt}
                width={mockupImage.width}
                height={mockupImage.height}
                className="w-full"
                priority
              />
            </Mockup>
          </MockupFrame>
          <div
            className="absolute bottom-0 left-0 right-0 w-full h-[303px]"
            style={{
              background: "linear-gradient(to top, #DCD5C1 0%, rgba(217, 217, 217, 0) 100%)",
              zIndex: 10,
            }}
          />
        </div>
      )}
    </div>
  )
})
Hero.displayName = "Hero"

// 添加动画样式
const animationStyles = `
  @keyframes appear {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-appear {
    animation: appear 0.8s ease-out forwards;
  }
  
  .delay-100 {
    animation-delay: 0.1s;
  }
  
  .delay-300 {
    animation-delay: 0.3s;
  }
  
  .delay-500 {
    animation-delay: 0.5s;
  }
  
  .delay-700 {
    animation-delay: 0.7s;
  }
  
  @font-face {
    font-family: 'Instrument Sans';
    src: url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@300;400;500;600;700&display=swap');
  }
  
  .font-instrument-sans {
    font-family: 'Instrument Sans', sans-serif;
  }

  .tooltip-trigger {
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tooltip-trigger:hover {
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    padding: 8px;
    margin: -8px;
  }
`;

export default function JimmyYangMBTIPage() {
  return (
    <>
      <style jsx global>{animationStyles}</style>
      
      <div className="min-h-screen bg-[#f3f1ea]">
        <Hero
          eyebrow="MBTI Personality Analysis"
          title="Jimmy O. Yang: The Entertainer&apos;s Journey"
          subtitle="An ESFP Analysis of the Entertainer Personality Type"
          ctaText="Explore Analysis"
          ctaLink="#analysis"
        />
        
        {/* 简介区域 */}
        <section id="analysis" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                Who is Jimmy O. Yang?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#f3f1ea] p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Career Highlights</h3>
                <ul className="space-y-2 text-gray-600 font-instrument-sans">
                  <li>• Stand-up comedian, actor, and writer</li>
                  <li>• Known for: &quot;Silicon Valley,&quot; &quot;Crazy Rich Asians,&quot; &quot;Space Force&quot;</li>
                  <li>• Started comedy after leaving finance career</li>
                  <li>• Malaysian-Chinese comedian bridging cultural gaps through humor</li>
                </ul>
              </div>
              
              <div className="bg-[#f3f1ea] p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Why ESFP Analysis?</h3>
                <ul className="space-y-2 text-gray-600 font-instrument-sans">
                  <li>• <AdvancedTooltip content="His public persona reveals clear personality patterns that align with ESFP characteristics">
                    <strong>Public persona</strong>
                  </AdvancedTooltip> reveals clear personality patterns</li>
                  <li>• <AdvancedTooltip content="His career choices from finance to comedy show typical ESFP adaptability and preference for engaging work">
                    <strong>Career choices</strong>
                  </AdvancedTooltip> align with ESFP characteristics</li>
                  <li>• <AdvancedTooltip content="His performance style demonstrates key ESFP traits like spontaneity and audience connection">
                    <strong>Performance style</strong>
                  </AdvancedTooltip> demonstrates key ESFP traits</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ESFP 概述 */}
        <section className="py-20 bg-[#f3f1ea]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                ESFP Overview - &quot;The Entertainer&quot;
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white p-6 rounded-lg text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">E</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 font-instrument-sans">Extraverted</h3>
                <p className="text-gray-600 font-instrument-sans text-sm">
                  Energized by social interaction
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">S</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 font-instrument-sans">Sensing</h3>
                <p className="text-gray-600 font-instrument-sans text-sm">
                  Focus on concrete details and present experiences
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">F</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 font-instrument-sans">Feeling</h3>
                <p className="text-gray-600 font-instrument-sans text-sm">
                  Makes decisions based on personal values and emotions
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">P</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 font-instrument-sans">Perceiving</h3>
                <p className="text-gray-600 font-instrument-sans text-sm">
                  Flexible, adaptable, spontaneous approach
                </p>
              </div>
            </div>

            <div className="mt-12 bg-white p-8 rounded-lg">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4 font-instrument-sans">Core ESFP Traits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ul className="space-y-2 text-gray-600 font-instrument-sans">
                  <li>• Natural performers and entertainers</li>
                  <li>• Emotionally expressive and authentic</li>
                </ul>
                <ul className="space-y-2 text-gray-600 font-instrument-sans">
                  <li>• Strong people skills and social awareness</li>
                  <li>• Adaptable and responsive to immediate environment</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Extraverted 分析 */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                Extraverted (E) - Social Energy & Connection
              </h2>
            </div>

            <div className="space-y-8">
              <div className="bg-[#f3f1ea] p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Evidence from Jimmy&apos;s Career</h3>
                <div className="space-y-4">
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="Quote: 'This one military brother came up to me... and then he started telling me his whole life story' - Shows comfort with spontaneous social interactions">
                      <strong>Comedy Performance</strong>
                    </AdvancedTooltip>: Thrives on stage interaction with live audiences
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He actively engages with fans on social media and enjoys spontaneous conversations with strangers">
                      <strong>Social Engagement</strong>
                    </AdvancedTooltip>: Actively engages with fans and social media
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="His success in ensemble casts like Silicon Valley and Space Force shows his collaborative nature">
                      <strong>Collaborative Work</strong>
                    </AdvancedTooltip>: Success in ensemble casts (Silicon Valley, Space Force)
                  </p>
                </div>
              </div>

              <div className="bg-[#f3f1ea] p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Real Examples</h3>
                <div className="space-y-4">
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He often shares stories about meeting people in dive bars and having deep conversations">
                      <strong>Enjoys dive bar conversations</strong>
                    </AdvancedTooltip> with strangers (military encounter)
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="His ability to handle unexpected situations during performances shows his adaptability">
                      <strong>Adapts quickly</strong>
                    </AdvancedTooltip> to unexpected social situations
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He feeds off audience energy and reactions during his stand-up performances">
                      <strong>Draws energy</strong>
                    </AdvancedTooltip> from audience reactions during performances
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sensing 分析 */}
        <section className="py-20 bg-[#f3f1ea]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                Sensing (S) - Concrete Details & Present Focus
              </h2>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Jimmy&apos;s Sensing Preferences</h3>
                <div className="space-y-4">
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="Quote: 'Those are like Malaysian slang words I grew up using... it adds so much color to a character'">
                      <strong>Character Development</strong>
                    </AdvancedTooltip>: Uncle Roger built from specific Malaysian slang and mannerisms
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="His comedy is based on real-life experiences rather than abstract concepts">
                      <strong>Observational Comedy</strong>
                    </AdvancedTooltip>: Uses concrete, real-life experiences as material
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He incorporates specific cultural nuances like 'body language,' 'postures,' 'tone'">
                      <strong>Cultural Details</strong>
                    </AdvancedTooltip>: Incorporates specific cultural nuances and behaviors
                  </p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Evidence</h3>
                <div className="space-y-4">
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He emphasizes specific details like 'Malaysian slang words,' 'body language,' 'postures,' 'tone'">
                      <strong>Emphasizes</strong>
                    </AdvancedTooltip> &quot;Malaysian slang words,&quot; &quot;body language,&quot; &quot;postures,&quot; &quot;tone&quot;
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="His mask-wearing comedy was based on immediate, tangible experiences during the pandemic">
                      <strong>Mask-wearing comedy</strong>
                    </AdvancedTooltip> based on immediate, tangible experiences
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He uses specific cultural observations rather than abstract generalizations">
                      <strong>Uses specific cultural observations</strong>
                    </AdvancedTooltip> rather than abstract concepts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feeling 分析 */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                Feeling (F) - Emotional Authenticity & Values
              </h2>
            </div>

            <div className="space-y-8">
              <div className="bg-[#f3f1ea] p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Jimmy&apos;s Feeling Orientation</h3>
                <div className="space-y-4">
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He values authentic emotional expression in his comedy and personal interactions">
                      <strong>Emotional Honesty</strong>
                    </AdvancedTooltip>: Values authentic emotional expression
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He addresses stereotypes while maintaining respect for different cultures">
                      <strong>Cultural Sensitivity</strong>
                    </AdvancedTooltip>: Addresses stereotypes while maintaining respect
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="His comedy serves to bridge cultural understanding rather than just entertain">
                      <strong>Personal Values</strong>
                    </AdvancedTooltip>: Comedy serves to bridge cultural understanding
                  </p>
                </div>
              </div>

              <div className="bg-[#f3f1ea] p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Key Examples</h3>
                <div className="space-y-4">
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="Quote: 'Korean people are... very emotionally honest. A Korean person will let you know when they disappointed' - Shows appreciation for authentic emotional expression">
                      <strong>Appreciation for Korean emotional directness</strong>
                    </AdvancedTooltip>
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He develops genuine characters rather than relying on stereotypical portrayals">
                      <strong>Genuine character development</strong>
                    </AdvancedTooltip> over stereotypical portrayals
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He uses humor to address serious cultural issues with sensitivity">
                      <strong>Uses humor</strong>
                    </AdvancedTooltip> to address serious cultural issues
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Perceiving 分析 */}
        <section className="py-20 bg-[#f3f1ea]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                Perceiving (P) - Flexibility & Spontaneity
              </h2>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Jimmy&apos;s Adaptive Nature</h3>
                <div className="space-y-4">
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="His transition from finance to comedy shows his adaptability and willingness to change paths">
                      <strong>Career Transition</strong>
                    </AdvancedTooltip>: Finance to comedy shows adaptability
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He is comfortable with improvisation and audience interaction during performances">
                      <strong>Performance Style</strong>
                    </AdvancedTooltip>: Comfortable with improvisation and audience interaction
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He builds comedy material from spontaneous life experiences">
                      <strong>Material Development</strong>
                    </AdvancedTooltip>: Builds comedy from spontaneous life experiences
                  </p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Evidence</h3>
                <div className="space-y-4">
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He handles unexpected social situations with humor and grace">
                      <strong>Handles unexpected social situations</strong>
                    </AdvancedTooltip> with humor
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He adapts his material for different audiences and contexts">
                      <strong>Adapts material</strong>
                    </AdvancedTooltip> for different audiences and contexts
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He has a flexible approach to character development and performance">
                      <strong>Flexible approach</strong>
                    </AdvancedTooltip> to character development and performance
                  </p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Professional Flexibility</h3>
                <div className="space-y-4">
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He successfully transitions between stand-up, acting, and writing">
                      <strong>Transitions</strong>
                    </AdvancedTooltip> between stand-up, acting, and writing
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He adjusts his comedy style for different platforms and audiences">
                      <strong>Adjusts comedy style</strong>
                    </AdvancedTooltip> for different platforms and audiences
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ESFP in Entertainment */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                ESFP in Entertainment - Natural Fit
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#f3f1ea] p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Why ESFP Traits Excel in Comedy</h3>
                <div className="space-y-4">
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He can read audience emotions and adjust his material accordingly">
                      <strong>People Skills</strong>
                    </AdvancedTooltip>: Reads audience emotions and adjusts accordingly
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="Audiences connect with his genuine, personal stories">
                      <strong>Authenticity</strong>
                    </AdvancedTooltip>: Audiences connect with genuine, personal stories
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He thrives in unpredictable live performance environments">
                      <strong>Spontaneity</strong>
                    </AdvancedTooltip>: Thrives in unpredictable live performance environments
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He uses humor to address sensitive topics effectively">
                      <strong>Emotional Intelligence</strong>
                    </AdvancedTooltip>: Uses humor to address sensitive topics effectively
                  </p>
                </div>
              </div>
              
              <div className="bg-[#f3f1ea] p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Jimmy&apos;s Success Factors</h3>
                <div className="space-y-4">
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He combines personal experience with universal themes that resonate with diverse audiences">
                      <strong>Combines personal experience</strong>
                    </AdvancedTooltip> with universal themes
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He maintains authenticity while entertaining">
                      <strong>Maintains authenticity</strong>
                    </AdvancedTooltip> while entertaining
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He adapts to various entertainment mediums successfully">
                      <strong>Adapts to various entertainment mediums</strong>
                    </AdvancedTooltip>
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="He builds genuine connections with diverse audiences">
                      <strong>Builds genuine connections</strong>
                    </AdvancedTooltip> with diverse audiences
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Character Development */}
        <section className="py-20 bg-[#f3f1ea]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                Character Development - Uncle Roger as ESFP Expression
              </h2>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">How Uncle Roger Reflects ESFP Traits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <p className="text-lg font-instrument-sans">
                      <AdvancedTooltip content="The character uses specific cultural mannerisms and language patterns from Malaysian culture">
                        <strong>Sensing</strong>
                      </AdvancedTooltip>: Specific cultural mannerisms and language patterns
                    </p>
                    <p className="text-lg font-instrument-sans">
                      <AdvancedTooltip content="The character shows emotionally expressive reactions to cooking 'crimes'">
                        <strong>Feeling</strong>
                      </AdvancedTooltip>: Emotionally expressive reactions to cooking &quot;crimes&quot;
                    </p>
                  </div>
                  <div className="space-y-4">
                    <p className="text-lg font-instrument-sans">
                      <AdvancedTooltip content="The character is highly animated and socially engaging">
                        <strong>Extraverted</strong>
                      </AdvancedTooltip>: Highly animated and socially engaging character
                    </p>
                    <p className="text-lg font-instrument-sans">
                      <AdvancedTooltip content="The character has a spontaneous, reactive personality">
                        <strong>Perceiving</strong>
                      </AdvancedTooltip>: Spontaneous, reactive personality
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Character Authenticity</h3>
                <div className="space-y-4">
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="The character is built from real Malaysian cultural elements">
                      <strong>Built from real Malaysian cultural elements</strong>
                    </AdvancedTooltip>
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="The character shows emotionally honest reactions">
                      <strong>Emotionally honest reactions</strong>
                    </AdvancedTooltip>
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="The character has an engaging, personable presentation style">
                      <strong>Engaging, personable presentation style</strong>
                    </AdvancedTooltip>
                  </p>
                  <p className="text-lg font-instrument-sans">
                    <AdvancedTooltip content="The character development is flexible based on audience response">
                      <strong>Flexible character development</strong>
                    </AdvancedTooltip> based on audience response
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 结论 */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-instrument-sans">
                Conclusion - The ESFP Advantage
              </h2>
            </div>

            <div className="space-y-8">
              <div className="bg-[#f3f1ea] p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Jimmy O. Yang&apos;s ESFP Success Formula</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <p className="text-lg font-instrument-sans">
                      <AdvancedTooltip content="His genuine personal experiences resonate with audiences">
                        <strong>Authenticity</strong>
                      </AdvancedTooltip>: Genuine personal experiences resonate with audiences
                    </p>
                    <p className="text-lg font-instrument-sans">
                      <AdvancedTooltip content="His flexible approach allows success across multiple platforms">
                        <strong>Adaptability</strong>
                      </AdvancedTooltip>: Flexible approach allows success across multiple platforms
                    </p>
                  </div>
                  <div className="space-y-4">
                    <p className="text-lg font-instrument-sans">
                      <AdvancedTooltip content="He handles cultural topics with sensitivity">
                        <strong>Emotional Intelligence</strong>
                      </AdvancedTooltip>: Sensitive handling of cultural topics
                    </p>
                    <p className="text-lg font-instrument-sans">
                      <AdvancedTooltip content="He has natural stage presence and audience connection">
                        <strong>Performance Energy</strong>
                      </AdvancedTooltip>: Natural stage presence and audience connection
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#f3f1ea] p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-instrument-sans">Key Takeaways</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <p className="text-lg font-instrument-sans">
                      <AdvancedTooltip content="ESFP traits enable authentic entertainment that connects with audiences">
                        <strong>ESFP traits</strong>
                      </AdvancedTooltip> enable authentic entertainment
                    </p>
                    <p className="text-lg font-instrument-sans">
                      <AdvancedTooltip content="He builds cultural bridges through emotional honesty">
                        <strong>Cultural bridge-building</strong>
                      </AdvancedTooltip> through emotional honesty
                    </p>
                  </div>
                  <div className="space-y-4">
                    <p className="text-lg font-instrument-sans">
                      <AdvancedTooltip content="His spontaneous creativity drives material development">
                        <strong>Spontaneous creativity</strong>
                      </AdvancedTooltip> drives material development
                    </p>
                    <p className="text-lg font-instrument-sans">
                      <AdvancedTooltip content="His social awareness enhances audience connection">
                        <strong>Social awareness</strong>
                      </AdvancedTooltip> enhances audience connection
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#f3f1ea] p-8 rounded-lg text-center">
                <p className="text-xl text-gray-600 font-instrument-sans italic">
                  Final Thought: Jimmy O. Yang exemplifies how ESFP personality traits can drive successful entertainment careers through authentic connection and emotional intelligence.
                </p>
                <p className="text-sm text-gray-500 mt-4 font-instrument-sans">
                  Note: This analysis is based on observable public behavior and career patterns. Actual MBTI type can only be determined through proper assessment by the individual.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
} 