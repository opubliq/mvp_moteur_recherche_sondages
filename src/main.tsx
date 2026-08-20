import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { AnnotationProvider } from "./context/AnnotationContext";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ConceptProvider } from "./context/ConceptContext";
import { LanguageProvider } from "./context/LanguageContext";
import { SearchProvider } from "./context/SearchContext";
import { SociodemoMappingProvider } from "./context/SociodemoMappingContext";
import "./index.css";
import "./App.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <ConceptProvider>
              <SociodemoMappingProvider>
                <SearchProvider>
                  {/* Annotations éphémères : au-dessus des routes, pour qu'un
                      aller-retour vers la recherche ne détruise pas un run. */}
                  <AnnotationProvider>
                    <App />
                  </AnnotationProvider>
                </SearchProvider>
              </SociodemoMappingProvider>
            </ConceptProvider>
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
