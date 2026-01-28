import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Step, TemplateOption } from "./types";

interface TemplateStepProps {
  templates: TemplateOption[];
  selectedTemplate: TemplateOption | null;
  onSelectTemplate: (template: TemplateOption) => void;
  onGoToQuantity: () => void;
  onGoToStep: (step: Step) => void;
}

export function TemplateStep({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onGoToQuantity,
  onGoToStep,
}: TemplateStepProps) {
  return (
    <motion.section
      key="template"
      className="flex min-h-[calc(100vh-14rem)] flex-col gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.length === 0 && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Template belum tersedia.
            </CardContent>
          </Card>
        )}
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className={`flex flex-col gap-3 rounded-2xl border p-4 text-left transition ${
              selectedTemplate?.id === template.id
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            }`}
            onClick={() => onSelectTemplate(template)}
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl">
              <Image
                src={template.url}
                alt={template.name}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <span className="text-sm font-semibold">{template.name}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" onClick={() => onGoToStep("payment")}>
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </Button>
        <Button size="lg" onClick={onGoToQuantity} disabled={!selectedTemplate}>
          Lanjutkan
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.section>
  );
}
