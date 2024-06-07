import getCurrentUser from "@/app/actions/getCurrentUser";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

export async function POST(request : Request){
    try{
        const currentUser = await getCurrentUser(); 
        const body  = await request.json();
        const {
            userId,
            isGroup,
            members,
            name
          } = body;

        // If user is not logged in , return unauthorized
        if (!currentUser?.id || !currentUser?.email) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // If current conversation is a group with 0/1 member or with no name , return bad request
        if (isGroup && (!members || members.length < 2 || !name)) {
            return new NextResponse('Invalid data', { status: 400 });
        }


        if (isGroup) {
            const newConversation = await prisma.conversation.create({
            data: {
                name,
                isGroup,
                image: body.image || '/logo.png',
                userConversations: {
                    create: [
                        // Connect the conversation to the current user
                        { user: { connect: { id: currentUser.id } } },
                        // Connect the conversation to each member in the body.members array
                        ...members.map(
                            (member: { value: string }) => ({
                                user: { connect: { id: member.value } }
                        }))
                    ]
                }
            },
            include: {
                userConversations: {
                    include: {
                      user: true,
                    }
                }
            }
            });
            
            
            return NextResponse.json(newConversation);
        }

        // If current conversation is a 1-to-1 conversation

        // Find conversations for currentUser
    const currentUserConversations = await prisma.userConversation.findMany({
        where: {
          userId: currentUser.id
        },
        select: {
          conversationId: true
        }
      });
  
      // Find conversations for the user specified in the body
      const bodyUserConversations = await prisma.userConversation.findMany({
        where: {
          userId: body.userId
        },
        select: {
          conversationId: true
        }
      });
  
      // Extract the conversation IDs from the results
      const currentUserConversationIds = currentUserConversations.map(uc => uc.conversationId);
      const bodyUserConversationIds = bodyUserConversations.map(buc => buc.conversationId);
  
      // Find the common conversation IDs
      const commonConversationIds = currentUserConversationIds.filter(id => bodyUserConversationIds.includes(id));
  
      // Fetch the details of the common conversations
      const commonConversations = await prisma.conversation.findMany({
        where: {
          id: { in: commonConversationIds }
        },
        include: {
          userConversations: {
            include: {
              user: true
            }
          }
        }
      });

        // Extracting the conversation if it exists
        const singleConversation = commonConversations[0];

        // If conversation exists , return the conversation
        if (singleConversation) {
          console.log(singleConversation);
          return NextResponse.json(singleConversation);
        }

        // If conversation does not exist , create a new conversation and return it
        const newConversation = await prisma.conversation.create({
            data: {
                userConversations: {
                  create: [
                    // Connect the conversation to the current user
                    { user: { connect: { id: currentUser.id } } },
                    // Connect the conversation to the user specified in the body
                    { user: { connect: { id: userId } } }
                  ]
                }
              },
              include: {
                userConversations: {
                  include: {
                    user: true,
                  }
                }
              }
        });

        console.log(newConversation);
        return NextResponse.json(newConversation);

    }
    catch(error: any){
        return new NextResponse('Internal Error', { status: 500 });
    }
}