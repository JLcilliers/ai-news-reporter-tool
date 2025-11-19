import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Replicate from 'replicate';
import supabase from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(request: Request) {
  try {
    const { businessData } = await request.json();

    if (!businessData) {
      return NextResponse.json(
        { error: 'Business data is required' },
        { status: 400 }
      );
    }

    // Step 1: Generate news script using OpenAI GPT-4
    console.log('Generating script...');
    const scriptResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional news reporter. Create a concise, engaging 30-second news script based on the business data provided. Make it sound natural and professional.',
        },
        {
          role: 'user',
          content: `Create a 30-second news report script about this business data: ${businessData}`,
        },
      ],
      max_tokens: 200,
    });

    const script = scriptResponse.choices[0].message.content || '';
    console.log('Script generated:', script.substring(0, 100) + '...');

    // Step 2: Generate audio using OpenAI TTS
    console.log('Generating audio...');
    const audioResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: script,
    });

    // Convert audio to base64 data URI (avoids file system operations in serverless)
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    console.log('Audio generated, size:', audioBuffer.length, 'bytes');
    const audioBase64 = audioBuffer.toString('base64');
    const audioDataUri = `data:audio/mpeg;base64,${audioBase64}`;

    // Step 3: Generate video using Replicate SadTalker
    console.log('Generating video with SadTalker...');
    let output;
    try {
      output = await replicate.run(
        'cjwbw/sadtalker:a519cc0cfebaaeade068b23899165a11ec76aaa1d2b313d40d214f204ec957a3',
        {
          input: {
            driven_audio: audioDataUri,
            source_image: 'https://i.imgur.com/5vPKgb4.jpg', // Default avatar image
            pose_style: 0,
            preprocess: 'crop',
          },
        }
      );
    } catch (replicateError: any) {
      console.error('Replicate error:', replicateError);
      if (replicateError.response?.status === 402) {
        throw new Error('Insufficient Replicate credits. Please add billing at https://replicate.com/account/billing');
      }
      throw replicateError;
    }

    const videoUrl = Array.isArray(output) ? output[0] : (output as unknown as string);
    console.log('Video generated:', videoUrl);

    // Step 4: Download and upload video to Supabase
    console.log('Downloading video...');
    const videoResponse = await fetch(videoUrl);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

    const videoFileName = `video-${uuidv4()}.mp4`;

    console.log('Uploading to Supabase...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(videoFileName, videoBuffer, {
        contentType: 'video/mp4',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload video: ${uploadError.message}`);
    }

    // Step 5: Get public URL
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(videoFileName);

    const publicUrl = urlData.publicUrl;

    // Step 6: Save metadata to database
    const { error: dbError } = await supabase
      .from('videos')
      .insert([
        {
          script,
          video_url: publicUrl,
        },
      ]);

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to save to database: ${dbError.message}`);
    }

    return NextResponse.json({ videoUrl: publicUrl });
  } catch (error) {
    console.error('Error in generation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}
