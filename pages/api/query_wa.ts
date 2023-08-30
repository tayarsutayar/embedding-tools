import type { NextApiRequest, NextApiResponse } from "next"
import { OpenAIEmbeddings } from "langchain/embeddings/openai"
import { PineconeStore } from "langchain/vectorstores/pinecone"
import { initPinecone } from "@/config/pinecone"
import { makePdfChain } from "@/lib/chain"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let namespace = 'bpjs' //default
  if (!req.body.question) {
    return res.status(400).json({ message: "No question in the request" })
  }

  if (!req.body.namespace) {
    namespace = namespace
  }

  const pinecone = await initPinecone()
  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME)

  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings({}),
    {
      pineconeIndex: index,
      textKey: "text",
      // @ts-ignore
      namespace: namespace,
    }
  )

  await createChainAndSendResponse(req, res, vectorStore)
}

async function createChainAndSendResponse(
  req: NextApiRequest,
  res: NextApiResponse,
  vectorStore: any
) {
  const { question, history } = req.body
  const sanitizedQuestion = question.trim().replaceAll("\n", " ")

  const chain = makePdfChain(vectorStore, null, 0)

  try {
    const result = await chain.call({
      question: sanitizedQuestion,
      chat_history: history || [],
    })
    res.status(200).json({
      result : result
    })
  } catch (error) {
    console.log("error", error)
  }
}
