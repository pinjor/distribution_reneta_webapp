import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableComboboxProps {
  label: string;
  placeholder: string;
  options: SearchableOption[];
  value?: string;
  onSelect: (option: SearchableOption) => void;
  disabled?: boolean;
  emptyMessage?: string;
  error?: string;
}

export default function SearchableCombobox({
  label,
  placeholder,
  options,
  value,
  onSelect,
  disabled,
  emptyMessage,
  error,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between",
              !selected && "text-muted-foreground",
              error && "border-destructive",
            )}
          >
            {selected ? (
              <span className="flex flex-col text-left">
                <span className="text-sm font-medium text-foreground">{selected.label}</span>
                {selected.description ? (
                  <span className="text-xs text-muted-foreground">{selected.description}</span>
                ) : null}
              </span>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>{emptyMessage || "No results found."}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.description ?? ""}`}
                    onSelect={() => {
                      onSelect(option);
                      setOpen(false);
                    }}
                    className="flex flex-col items-start gap-1"
                  >
                    <span className="text-sm font-medium text-foreground">{option.label}</span>
                    {option.description ? (
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}


