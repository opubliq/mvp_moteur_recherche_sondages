import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { AnnotationProvider } from "./context/AnnotationContext";
import { CartProvider } from "./context/CartContext";
import { SearchProvider } from "./context/SearchContext";
import "./index.css";
import "./App.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <CartProvider>
        <SearchProvider>
          {/* Annotations éphémères : au-dessus des routes, pour qu'un
              aller-retour vers la recherche ne détruise pas un run. */}
          <AnnotationProvider>
            <App />
          </AnnotationProvider>
        </SearchProvider>
      </CartProvider>
    </BrowserRouter>
  </StrictMode>,
);
