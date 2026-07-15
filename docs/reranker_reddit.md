
[deleted]
•
2y ago

Cohere is easy, fast, cheap and pretty good, but LLM reranking can produce better results in my experience. Im using gpt4o-mini as a reranker which adds an extra 1 cent per query and maybe 1 extra second but outperforms cohere on maybe 10% of queries. For me its definitely worth using the llm approach, but i imagine there are plenty of cases where it would be too expensive or slow.
5
u/Obvious-Ad2752 avatar
Obvious-Ad2752
•
2y ago

Amazing. Can you share the prompt or method you use with gpt4o for reranking? Thanks.
1
[deleted]
•
2y ago

So using *gpt4o-mini* specifically to keep costs low, but very simply passing query and document chunks to LLM and asking

"""how useful is this text on a scale of 0-100 for answering this query?"""

You can also take the approach of simply asking "is this text useful for answering this query? Yes or no" and collect the log probs (this is the probability that the model assigned to the token it ended up choosing in its output, which is a proxy for the confidence of its answer) associated with the answer to create a relevance score.

Then collecting the scores for all the docs and using them to rerank the vector db's output. You can optimize further if needed by including something like:

"""

For a piece of text to be useful it should

    <insert something specific to your use case>

    <insert something else specific to your usecase>

    ...

provide a three word explanation of the reasoning for your score followed by the score"""

I've been using the structured outputs api for this with a response model to make it easy to handle the output.

DocumentScore(BaseModel):
explanation: str
score: int

To optimize the prompting a bit, I recommend starting with using a more expensive model for reranking and saving its input/output to use as ground truth for a few diverse queries, then when you transfer to the cheap model you can measure the correlation of the scores across the same queries and adjust prompts checking how the correlation changes each time.

One other possibility I've been exploring: you can do interesting things by looking at chunks that had low vector similarity but scored highly in the reranking, like trying to assemble the final context for the llm from a mix of both low and high vector similarity chunks that score highly with the reranker. This is a good automatic way to provide the LLM with more diverse context that is all still useful to answering the user's query.

Lastly, to minimize latency and cost using this method, you can pass the chunks to the reranking LLM in order of vector similarity and stop reranking once you find a certain number of chunks that pass the score threshold. Right now my set up is to pass the chunks from the vector search results until 6 chunks that gpt4o-mini scored as >=90 are found.

In my current set up the reranker will rerank a max of 400 results and it takes a couple seconds and costs 1-2 cents per query.
