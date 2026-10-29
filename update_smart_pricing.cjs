const fs = require('fs');

let content = fs.readFileSync('src/components/SmartPricing.tsx', 'utf8');

// Replace FormState and initialState
content = content.replace(
`type FormState = {
  productName: string;
  cogs: number | "";
  monthlyFixed: number | "";
  estMonthlySales: number | "";
};

const initialState: FormState = {
  productName: "",
  cogs: "",
  monthlyFixed: "",
  estMonthlySales: "",
};`,
`type OverheadItem = {
  id: string;
  name: string;
  amount: number | "";
};

type FormState = {
  productName: string;
  quantity: number | "";
  directMaterial: number | "";
  directLabor: number | "";
  overheads: OverheadItem[];
  monthlyFixed: number | "";
  estMonthlySales: number | "";
};

const initialState: FormState = {
  productName: "",
  quantity: 1,
  directMaterial: "",
  directLabor: "",
  overheads: [],
  monthlyFixed: "",
  estMonthlySales: "",
};`
);

content = content.replace(
  `  const breakEvenPerUnit = (): number | null => {
    const { cogs, monthlyFixed, estMonthlySales } = form;
    if (
      cogs === "" ||
      monthlyFixed === "" ||
      estMonthlySales === "" ||
      estMonthlySales === 0
    )
      return null;
    const totalVariable = Number(cogs);
    const allocFixedPerUnit = Number(monthlyFixed) / Number(estMonthlySales);
    return Math.max(0, totalVariable + allocFixedPerUnit);
  };`,
  `  const breakEvenPerUnit = (): number | null => {
    const { monthlyFixed, estMonthlySales } = form;
    if (
      form.directMaterial === "" ||
      monthlyFixed === "" ||
      estMonthlySales === "" ||
      estMonthlySales === 0
    )
      return null;
    const totalVariable = cogsPenjualan;
    const allocFixedPerUnit = Number(monthlyFixed) / Number(estMonthlySales);
    return Math.max(0, totalVariable + allocFixedPerUnit);
  };`
);

content = content.replace(
  `  const handleDemoIcedTea = async () => {
    // Fill with reasonable demo values for 'Ice Tea'
    setForm({
      productName: "Ice Tea",
      cogs: 2500,
      monthlyFixed: 1200000,
      estMonthlySales: 800,
    });`,
  `  const handleDemoIcedTea = async () => {
    // Fill with reasonable demo values for 'Ice Tea'
    setForm({
      productName: "Ice Tea",
      quantity: 1,
      directMaterial: 1500,
      directLabor: 500,
      overheads: [{ id: "1", name: "Es Batu & Cup", amount: 500 }],
      monthlyFixed: 1200000,
      estMonthlySales: 800,
    });`
);

content = content.replace(
  `  const breakEven = breakEvenPerUnit();

  const cogsNum = safeNumber(form.cogs);`,
  `  const cogsAkuntansi = useMemo(() => {
    const dm = Number(form.directMaterial) || 0;
    const qty = Number(form.quantity) || 1;
    return dm / qty;
  }, [form.directMaterial, form.quantity]);

  const cogsPenjualan = useMemo(() => {
    const dm = Number(form.directMaterial) || 0;
    const dl = Number(form.directLabor) || 0;
    const oh = form.overheads.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const qty = Number(form.quantity) || 1;
    return (dm + dl + oh) / qty;
  }, [form.directMaterial, form.directLabor, form.overheads, form.quantity]);

  const breakEven = breakEvenPerUnit();

  const cogsNum = cogsPenjualan;`
);

content = content.replace(
  `    cogs: cogsNum !== null && cogsNum >= 0,`,
  `    cogs: form.directMaterial !== "" && Number(form.directMaterial) >= 0,`
);

content = content.replace(
  `    if (recommendedPrice && Number(form.cogs) >= 0 && recommendedPrice !== 0) {
      profitMarginPct =
        Math.round(
          ((recommendedPrice - Number(form.cogs)) / recommendedPrice) * 10000,
        ) / 100;
    }`,
  `    if (recommendedPrice && cogsNum >= 0 && recommendedPrice !== 0) {
      profitMarginPct =
        Math.round(
          ((recommendedPrice - cogsNum) / recommendedPrice) * 10000,
        ) / 100;
    }`
);

// Replace UI
const oldCogsUI = `              <div>
                <label className="text-sm font-medium text-gray-700">
                  COGS / unit (Rp)
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    value={form.cogs}
                    onChange={(e) => handleChange("cogs", e.target.value)}
                    min={0}
                    step={priceStep}
                    className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Stepper
                    disabled={form.cogs === ""}
                    onDec={() =>
                      setForm((s) => ({
                        ...s,
                        cogs:
                          s.cogs === ""
                            ? ""
                            : Math.max(
                                0,
                                roundTo(Number(s.cogs) - priceStep, priceStep),
                              ),
                      }))
                    }
                    onInc={() =>
                      setForm((s) => ({
                        ...s,
                        cogs:
                          s.cogs === ""
                            ? ""
                            : roundTo(Number(s.cogs) + priceStep, priceStep),
                      }))
                    }
                  />
                </div>
                {form.cogs !== "" && (
                  <div className="mt-2">
                    <input
                      type="range"
                      min={0}
                      max={50_000}
                      step={priceStep}
                      value={Number(form.cogs)}
                      onChange={(e) => handleChange("cogs", e.target.value)}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[11px] text-gray-500">
                      <span>0</span>
                      <span>50k</span>
                    </div>
                  </div>
                )}
              </div>`;

const newCogsUI = `              <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-xl bg-white shadow-sm mt-4">
                <div className="md:col-span-2">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    Perhitungan COGS
                  </h4>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Jumlah (Unit)
                  </label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => handleChange("quantity", e.target.value)}
                    min={1}
                    className="w-full mt-1 rounded-xl border bg-gray-50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Direct Material (Rp)
                  </label>
                  <input
                    type="number"
                    value={form.directMaterial}
                    onChange={(e) => handleChange("directMaterial", e.target.value)}
                    min={0}
                    className="w-full mt-1 rounded-xl border bg-gray-50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Direct Labor (Rp)
                  </label>
                  <input
                    type="number"
                    value={form.directLabor}
                    onChange={(e) => handleChange("directLabor", e.target.value)}
                    min={0}
                    className="w-full mt-1 rounded-xl border bg-gray-50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Overheads</label>
                    <button 
                      type="button" 
                      onClick={() => setForm(s => ({...s, overheads: [...s.overheads, { id: Date.now().toString(), name: "", amount: "" }]}))}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20"
                    >
                      + Tambah Overhead
                    </button>
                  </div>
                  {form.overheads.map((oh, idx) => (
                    <div key={oh.id} className="flex items-center gap-2 mt-2">
                      <input 
                        type="text" 
                        placeholder="Nama Overhead"
                        value={oh.name}
                        onChange={(e) => {
                          const newOh = [...form.overheads];
                          newOh[idx].name = e.target.value;
                          setForm(s => ({...s, overheads: newOh}));
                        }}
                        className="flex-1 rounded-xl border bg-gray-50 px-3 py-2 outline-none text-sm"
                      />
                      <input 
                        type="number" 
                        placeholder="Rp"
                        value={oh.amount}
                        onChange={(e) => {
                          const newOh = [...form.overheads];
                          newOh[idx].amount = e.target.value === "" ? "" : Number(e.target.value);
                          setForm(s => ({...s, overheads: newOh}));
                        }}
                        className="w-32 rounded-xl border bg-gray-50 px-3 py-2 outline-none text-sm"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const newOh = form.overheads.filter((_, i) => i !== idx);
                          setForm(s => ({...s, overheads: newOh}));
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="md:col-span-2 bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">COGS Akuntansi / unit</span>
                    <span className="font-bold text-blue-800">{formatCurrency(cogsAkuntansi)}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-gray-500">COGS Penjualan / unit</span>
                    <span className="font-bold text-primary">{formatCurrency(cogsPenjualan)}</span>
                  </div>
                </div>
              </div>`;

content = content.replace(oldCogsUI, newCogsUI);

fs.writeFileSync('src/components/SmartPricing.tsx', content);
console.log("Replaced SmartPricing.tsx");
