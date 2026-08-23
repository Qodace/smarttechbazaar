import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroBanner from "@/components/sections/HeroBanner";
import TopCategories from "@/components/sections/TopCategories";
import ProductSection from "@/components/sections/ProductSection";
import BrandsSection from "@/components/sections/BrandsSection";
import AdBannerSlider from "@/components/sections/AdBannerSlider";
import BestSellersSection from "@/components/sections/BestSellersSection";
import MostPopularSection from "@/components/sections/MostPopularSection";
import HotBrandsSection from "@/components/sections/HotBrandsSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import JsonLd from "@/components/seo/JsonLd";
import { 
  generateOrganizationSchema, 
  generateWebSiteSchema, 
  generateLocalBusinessSchema 
} from "@/lib/schema";
import {
  getHomepageSections,
  getCategories,
  getBrands,
  getHeroSliderBanners,
  getAdBanners,
  getBestSellers,
  getMostPopular,
  getHotBrands,
} from "@/lib/data";

// Enable ISR with 60 second revalidation for fast loads with fresh data
export const revalidate = 60;

export default async function HomePage() {
  // Fetch all data in parallel using cached functions
  const [
    productSections,
    categories,
    brands,
    heroSliderBanners,
    adBanners,
    bestSellers,
    mostPopular,
    hotBrands,
  ] = await Promise.all([
    getHomepageSections(),
    getCategories(),
    getBrands(),
    getHeroSliderBanners(),
    getAdBanners(),
    getBestSellers(),
    getMostPopular(),
    getHotBrands(),
  ]);

  // Schema markup for homepage
  const schemas = [
    generateOrganizationSchema(),
    generateWebSiteSchema(),
    generateLocalBusinessSchema(),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Schema markup */}
        <JsonLd data={schemas} />

        {/* Hero Slider - 1500x450 banners */}
        <HeroBanner banners={heroSliderBanners.length > 0 ? heroSliderBanners : undefined} />

        {/* Features Strip */}
        <FeaturesSection />

        {/* Top Categories */}
        <TopCategories categories={categories} />

        {/* Best Sellers Section */}
        {bestSellers.length > 0 && (
          <BestSellersSection products={bestSellers} />
        )}

        {/* Dynamic Ad Banner Slider - 1500x300 banners from database */}
        {adBanners.length > 0 && (
          <AdBannerSlider banners={adBanners} />
        )}

        {/* First 2 Product Sections */}
        {productSections.slice(0, 2).map((section) => (
          <ProductSection key={section.slug} section={section} />
        ))}

        {/* Hot Brands Section */}
        {hotBrands.length > 0 && (
          <HotBrandsSection brands={hotBrands} />
        )}

        {/* Most Popular Section */}
        {mostPopular.length > 0 && (
          <MostPopularSection products={mostPopular} />
        )}

        {/* Remaining Product Sections */}
        {productSections.slice(2).map((section) => (
          <ProductSection key={section.slug} section={section} />
        ))}

        {/* Brands Carousel */}
        <BrandsSection brands={brands} />

        {/* Show message if no products */}
        {productSections.length === 0 && bestSellers.length === 0 && mostPopular.length === 0 && (
          <div className="mx-auto max-w-7xl px-4 py-20 text-center">
            <h2 className="heading-lg mb-4">No Products Available</h2>
            <p className="body-md text-muted-foreground">
              Products will appear here once they are added to the database.
              Configure homepage sections in the admin panel.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
