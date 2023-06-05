import { Layout, Text, Page } from '@vercel/examples-ui'
import { Chat } from '../components/Chat'

function Home() {
  return (
    <Page className="flex flex-col gap-12">
      <section className="flex flex-col gap-6">
        <Text variant="h1">OpenAI GPT model</Text>
        <Text className="text-zinc-600">
            This is a demo Web form for <strong>Ben</strong> built by{' '} <strong>PK</strong>
        </Text>
      </section>

      <section className="flex flex-col gap-3">
        <Text variant="h2">AI Chat</Text>
        <div className="">
          <Chat />
        </div>
      </section>
    </Page>
  )
}

Home.Layout = Layout

export default Home
