import { useState, useEffect } from 'react'
import BarChartViz from './BarChartViz'
import { themeChange } from "theme-change";
import { Listbox } from '@headlessui/react';

const fonts = [
  { name: "Inter", class: "font-inter" },
  { name: "Roboto", class: "font-roboto" },
  { name: "Open Sans", class: "font-open" },
  { name: "Montserrat", class: "font-montserrat" },
  { name: "Nunito", class: "font-nunito" },
  { name: "Source Sans Pro", class: "font-source" },
  { name: "IBM Plex Sans", class: "font-ibm" },
  { name: "Space Grotesk", class: "font-space" },
  { name: "Merriweather (Serif)", class: "font-serif" },
  { name: "Fira Mono (Mono)", class: "font-mono" },
  { name: "Poppins", class: "font-poppins" },
  { name: "Lato", class: "font-lato" },
  { name: "Raleway", class: "font-raleway" },
  { name: "Ubuntu", class: "font-ubuntu" },
  { name: "Muli", class: "font-muli" },
  { name: "Work Sans", class: "font-work" },
  { name: "Nunito Sans", class: "font-nunitosans" },
  { name: "Quicksand", class: "font-quicksand" },
  { name: "Rubik", class: "font-rubik" },
  { name: "Fira Sans", class: "font-firasans" },
];

function extractFontName(label) {
  return label.includes('(') ? label.split(' (')[0] : label;
}

const themes = [
  "light", "dark", "cupcake", "bumblebee", "emerald", "corporate", "synthwave",
  "retro", "cyberpunk", "valentine", "halloween", "garden", "forest", "aqua",
  "lofi", "pastel", "fantasy", "wireframe", "black", "luxury", "dracula",
  "cmyk", "autumn", "business", "acid", "lemonade", "night", "coffee", "winter",
];

function App() {
  useEffect(() => {
    themeChange(false);
  }, []);
  const [text, setText] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState(null);
  const [vizData, setVizData] = useState([]);
  const getRandomItem = (array) => {
    // Fisher-Yates shuffle, but we only need one item
    const index = Math.floor(Math.random() * array.length);
    return array[index];
  };
  const [selectedTheme, setSelectedTheme] = useState(getRandomItem(themes));
  const [font, setFont] = useState(getRandomItem(fonts).class);

  useEffect(() => {
    if (selectedTheme) {
      document.documentElement.setAttribute("data-theme", selectedTheme);
    }
  }, [selectedTheme]);

  const getSearchResults = async () => {
    setError(null)
    let query = text.trim();

    if (!query) {
      try {
        const resp = await fetch('https://random-word-api.vercel.app/api?words=3');
        const data = await resp.json();
        query = data.join(' ');
        setText(query);
      } catch (e) {
        const fallbackWords = ["forest", "computer", "friend", "music", "coffee", "river", "dream"];
        const shuffled = fallbackWords.sort(() => 0.5 - Math.random());
        query = shuffled.slice(0, 3).join(' ');
        setText(query);
      }
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, top_k: 10 }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResults(data.results)
      setSelected([])
      setVizData([])
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchViz = async () => {
    try {
      const payload = selected.map((id) => {
        const [survey_id, variable_id] = id.split("::")
        return { survey_id, variable_id }
      })
      const res = await fetch(`${import.meta.env.VITE_API_URL}/viz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload })
      })
      const data = await res.json()
      setVizData(data.distributions)
    } catch (err) {
      console.error("Erreur viz:", err)
    }
  }

  return (
    <div className={`min-h-screen bg-base-200 text-base-content ${font}`}>
      {/* Header/navbar */}
      <header className="flex items-center justify-between px-6 py-4 bg-base-100 border-b border-base-300">
        <div className="text-xl font-bold">Opubliq – Moteur de recherche</div>
        <div className="flex gap-4">
          {/* Dropdown theme */}
          <div className="relative">
            <label className="text-sm font-medium mr-2">Thème:</label>
            <Listbox value={selectedTheme} onChange={setSelectedTheme}>
              <Listbox.Button className="select select-bordered w-40" data-theme={selectedTheme}>
                {selectedTheme}
              </Listbox.Button>
              <Listbox.Options className="absolute left-0 w-40 mt-2 max-h-64 overflow-y-auto bg-base-100 rounded shadow-lg z-50">
                {themes.map(theme => (
                  <Listbox.Option
                    key={theme}
                    value={theme}
                    data-theme={theme}
                    className="p-2 cursor-pointer rounded bg-base-100 text-base-content"
                  >
                    {theme}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Listbox>
          </div>
          {/* Dropdown font */}
          <div className="relative">
            <label className="text-sm font-medium mr-2">Police:</label>
            <Listbox value={font} onChange={setFont}>
              <Listbox.Button
                className="select select-bordered w-40"
                style={{ fontFamily: extractFontName(fonts.find(f => f.class === font)?.name || "") }}
              >
                {fonts.find(f => f.class === font)?.name}
              </Listbox.Button>
              <Listbox.Options className="absolute left-0 w-40 mt-2 max-h-64 overflow-y-auto bg-base-100 rounded shadow-lg z-50">
                {fonts.map(f => (
                  <Listbox.Option
                    key={f.class}
                    value={f.class}
                    style={{ fontFamily: extractFontName(f.name) }}
                    className="p-1 text-sm cursor-pointer"
                  >
                    {f.name}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Listbox>
          </div>
        </div>
      </header>

      {/* Layout principal avec sidebar */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-base-100 border-r border-base-300 flex flex-col p-6 gap-6">
          <h2 className="text-lg font-bold mb-4">Recherche</h2>
          <textarea
            className="textarea textarea-bordered w-full"
            rows={4}
            placeholder="Entrez une requête..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div>
            <h3 className="text-md font-semibold mb-2">Variables à visualiser</h3>
            {results.length > 0 && (
              <ul className="list-disc ml-5 space-y-2">
                {results.map((r, i) => {
                  const id = `${r.survey_id}::${r.variable_id}`;
                  const isChecked = selected.includes(id);
                  // const disabled = !isChecked && selected.length >= 3;
                  return (
                    <li key={id} className="border-b pb-2">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          // disabled={disabled}
                          onChange={() => {
                            setSelected(prev =>
                              isChecked
                                ? prev.filter(v => v !== id)
                                : [...prev, id]
                            );
                          }}
                          className="checkbox checkbox-primary"
                        />
                        <span>
                          <strong>{r.survey_id} / {r.variable_id}</strong> — Score : {r.similarity_score.toFixed(3)}
                          <br />
                          <em>{r.text}</em>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={getSearchResults}
              className="btn btn-primary flex-1"
            >
              Lancer recherche
            </button>
            {selected.length > 0 && (
              <button
                onClick={fetchViz}
                className="btn btn-secondary flex-1"
              >
                Afficher graphiques
              </button>
            )}
          </div>
          {error && (
            <p className="text-error mt-4">Erreur : {error}</p>
          )}
        </aside>
        {/* Contenu principal */}
        <main className="flex-1 p-8 overflow-y-auto">
          <h1 className="text-2xl font-bold mb-6">Visualisations</h1>
          {vizData.length > 0 && (
            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                md:grid-cols-3
                gap-6
              "
              style={{ minHeight: "300px" }} // optionnel, pour le look
            >
              {vizData.map((d, i) => (
                <BarChartViz key={i} title={d.label} data={d} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
