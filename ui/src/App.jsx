import { useState } from 'react'

function App() {
  const [text, setText] = useState('')
  const [embedding, setEmbedding] = useState(null)
  const [error, setError] = useState(null)

  const getEmbedding = async () => {
    setError(null)
    try {
      const res = await fetch('http://localhost:8000/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setEmbedding(data.embedding)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-8">
      <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-xl p-6">
        <h1 className="text-2xl font-semibold mb-4">Embedding API Demo</h1>
        
        <textarea
          className="w-full border p-3 rounded mb-4"
          rows={4}
          placeholder="Entrez un texte..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <button
          onClick={getEmbedding}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Obtenir embedding
        </button>

        {error && (
          <p className="text-red-600 mt-4">Erreur : {error}</p>
        )}

        {embedding && (
          <div className="mt-6">
            <h2 className="text-lg font-medium mb-2">Résultat</h2>
            <p>Longueur du vecteur : {embedding.length}</p>
            <pre className="bg-gray-200 text-sm p-2 mt-2 rounded">
              {JSON.stringify(embedding.slice(0, 5), null, 2)}...
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
