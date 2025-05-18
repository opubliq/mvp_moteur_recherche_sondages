import { useState } from 'react'

function App() {
  const [text, setText] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState([])
  const [error, setError] = useState(null)

  const getSearchResults = async () => {
    setError(null)
    try {
      const res = await fetch('http://localhost:8000/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, top_k: 5 }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResults(data.results)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-8">
      <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-xl p-6">
        <h1 className="text-2xl font-semibold mb-4">Recherche sémantique</h1>

        <textarea
          className="w-full border p-3 rounded mb-4"
          rows={4}
          placeholder="Entrez une requête..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <button
          onClick={getSearchResults}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Lancer recherche
        </button>

        {error && (
          <p className="text-red-600 mt-4">Erreur : {error}</p>
        )}

        {results.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-medium mb-2">Résultats</h2>
            <ul className="list-disc ml-5 space-y-2">
            {results.map((r, i) => {
              const id = `${r.survey_id}::${r.variable_id}`
              const isChecked = selected.includes(id)
              const disabled = !isChecked && selected.length >= 3

              return (
                <li key={id} className="border-b pb-2">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={disabled}
                      onChange={() => {
                        setSelected((prev) =>
                          isChecked ? prev.filter((v) => v !== id) : [...prev, id]
                        )
                      }}
                    />
                    <span>
                      <strong>{r.survey_id} / {r.variable_id}</strong> — Score : {r.similarity_score.toFixed(3)}
                      <br />
                      <em>{r.text}</em>
                    </span>
                  </label>
                </li>
              )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
