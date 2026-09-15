"use client";

import { motion } from "motion/react";
import { TESTIMONIOS } from "@/lib/testimonios";

// Franja discreta de confianza temprana, justo debajo del Hero -- citas
// reales y cortas (mismas 3 de Testimonios más abajo), sin métricas
// inventadas ("+5.000 médicos" y similares no existen en ningún lado real).
export function SocialProof() {
  return (
    <section className="border-y border-border/60 bg-muted/20 py-8">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-3">
        {TESTIMONIOS.map((t, i) => (
          <motion.blockquote
            key={t.nombre}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="text-sm text-muted-foreground"
          >
            <p className="text-pretty">&ldquo;{t.texto.split(".")[0]}.&rdquo;</p>
            <footer className="mt-2 text-xs font-semibold text-foreground">
              {t.nombre} <span className="font-normal text-muted-foreground">· {t.rol}</span>
            </footer>
          </motion.blockquote>
        ))}
      </div>
    </section>
  );
}
