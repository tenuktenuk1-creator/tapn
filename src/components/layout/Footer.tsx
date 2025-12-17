import { Link } from 'react-router-dom';
import { MapPin, Mail, Instagram, Twitter, Facebook } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Logo & Tagline */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <MapPin className="h-6 w-6 text-primary" />
              <span className="font-display font-bold text-xl text-primary">TAPN</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Tap into the night.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Quick Links</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link to="/venues" className="hover:text-foreground transition-colors">
                  Venues
                </Link>
              </li>
              <li>
                <Link to="/venues" className="hover:text-foreground transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/#how-it-works" className="hover:text-foreground transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/#partner" className="hover:text-foreground transition-colors">
                  Partner With Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:hello@tapn.com" className="hover:text-foreground transition-colors">
                  hello@tapn.com
                </a>
              </li>
            </ul>
          </div>

          {/* Follow Us */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Follow Us</h4>
            <div className="flex items-center gap-3">
              <a 
                href="#" 
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
              >
                <Instagram className="h-5 w-5 text-muted-foreground" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
              >
                <Twitter className="h-5 w-5 text-muted-foreground" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
              >
                <Facebook className="h-5 w-5 text-muted-foreground" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-border">
        <div className="container py-6 text-center text-sm text-muted-foreground">
          TAPN © {new Date().getFullYear()} — All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
