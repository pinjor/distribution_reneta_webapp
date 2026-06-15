import fs from "fs";
import path from "path";

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

function getLucideImports(content) {
  const imported = new Set();
  const re = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]lucide-react['"]/gs;
  let m;
  while ((m = re.exec(content)) !== null) {
    m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((name) => imported.add(name.replace(/^type\s+/, "")));
  }
  return imported;
}

/** Lucide icons used as JSX tags or icon={Icon} props */
function getUsedLucideLike(content) {
  const used = new Set();
  for (const re of [
    /icon=\{([A-Z][a-zA-Z0-9]*)\}/g,
    /<([A-Z][a-zA-Z0-9]*)\s+[^>]*className="[^"]*\bh-[345]\b/g,
    /<([A-Z][a-zA-Z0-9]*)\s+className="[^"]*\bh-[345]\b/g,
  ]) {
    let m;
    while ((m = re.exec(content)) !== null) used.add(m[1]);
  }
  return used;
}

const SKIP = new Set([
  "Card", "Button", "Input", "Label", "Select", "SelectContent", "SelectItem",
  "SelectTrigger", "SelectValue", "Table", "TableBody", "TableCell", "TableHead",
  "TableHeader", "TableRow", "Dialog", "DialogContent", "DialogHeader", "DialogTitle",
  "DialogDescription", "Badge", "Form", "FormField", "FormItem", "FormLabel",
  "FormControl", "FormMessage", "Tabs", "TabsContent", "TabsList", "TabsTrigger",
  "Sheet", "SheetContent", "SheetHeader", "SheetTitle", "SheetDescription",
  "Popover", "PopoverContent", "PopoverTrigger", "DropdownMenu", "DropdownMenuContent",
  "DropdownMenuItem", "DropdownMenuTrigger", "Alert", "AlertDescription", "AlertTitle",
  "Checkbox", "RadioGroup", "RadioGroupItem", "Textarea", "Separator", "ScrollArea",
  "Tooltip", "TooltipContent", "TooltipProvider", "TooltipTrigger", "Avatar",
  "AvatarFallback", "AvatarImage", "Progress", "Switch", "Skeleton", "Collapsible",
  "CollapsibleContent", "CollapsibleTrigger", "Command", "CommandInput", "CommandList",
  "CommandEmpty", "CommandGroup", "CommandItem", "Calendar", "DatePicker",
  "DataTable", "PageHeader", "OrderBreadcrumb", "LoadingSpinner", "TransportStatCard",
  "TransportPageHeader", "TransportQuickNav", "OrderStatusCard", "OrderLifecycleFlow",
  "PieLegendList", "AnimatedCheckMark", "CheckBox", "Link", "NavLink", "Outlet",
  "Routes", "Route", "BrowserRouter", "Router", "Fragment", "Suspense", "StrictMode",
  "Provider", "ThemeProvider", "AuthProvider", "QueryClientProvider", "MainLayout",
  "AppSidebar", "AppHeader", "SidebarInset", "SidebarProvider", "Sidebar",
  "SidebarContent", "SidebarHeader", "SidebarMenu", "SidebarMenuItem", "SidebarMenuButton",
  "SidebarGroup", "SidebarGroupLabel", "SidebarGroupContent", "SidebarFooter",
  "SidebarTrigger", "SidebarRail", "Recharts", "ResponsiveContainer", "BarChart",
  "Bar", "XAxis", "YAxis", "CartesianGrid", "Legend", "PieChart", "Pie", "Cell",
  "LineChart", "Line", "AreaChart", "Area", "ComposedChart", "Scatter", "ScatterChart",
  "ZAxis", "Tooltip as RechartsTooltip", "CardContent", "CardHeader", "CardTitle",
  "CardDescription", "CardFooter", "AnimatePresence", "motion", "SignInCard2",
]);

const issues = [];
for (const file of walk("src/pages")) {
  const content = fs.readFileSync(file, "utf8");
  const used = [...getUsedLucideLike(content)].filter((n) => !SKIP.has(n));
  if (used.length === 0) continue;
  const imported = getLucideImports(content);
  const missing = used.filter((i) => !imported.has(i));
  if (missing.length) issues.push({ file, missing: [...new Set(missing)] });
}

if (issues.length === 0) {
  console.log("No missing lucide imports detected in pages.");
} else {
  for (const { file, missing } of issues) {
    console.log(`${file}: ${missing.join(", ")}`);
  }
}
