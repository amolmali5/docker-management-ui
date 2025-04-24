'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { io, Socket } from 'socket.io-client';

// Import xterm.css
try {
  require('xterm/css/xterm.css');
} catch (e) {
  console.warn('Could not load xterm.css');
}

interface ContainerTerminalProps {
  containerId: string;
}

export default function ContainerTerminal({ containerId }: ContainerTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<XTerm | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [fitAddon, setFitAddon] = useState<FitAddon | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // First useEffect: Initialize the terminal instance but don't attach to DOM yet
  useEffect(() => {
    console.log('Initializing terminal instance');
    if (typeof window === 'undefined') return;

    try {
      // Create terminal instance
      const terminal = new XTerm({
        cursorBlink: true,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 14,
        theme: {
          background: '#000000',
          foreground: '#00ff00',
          cursor: '#ffffff'
        },
        convertEol: true
      });

      // Store terminal reference
      setTerm(terminal);

      // Connect to socket.io server
      const socketInstance = io('http://localhost:3001', {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      setSocket(socketInstance);
    } catch (error: any) {
      console.error('Error initializing terminal:', error);
      setError(`Failed to initialize terminal: ${error.message || 'Unknown error'}`);
    }

    // Cleanup
    return () => {
      console.log('Cleaning up terminal instance');
      if (socket) {
        console.log('Disconnecting socket');
        socket.disconnect();
      }

      if (term) {
        console.log('Disposing terminal');
        term.dispose();
      }
    };
  }, []);

  // Second useEffect: Set up socket event handlers
  useEffect(() => {
    if (!socket) return;

    // Set up socket event handlers
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('container:shell:ready', () => {
      console.log('Shell ready');
      setConnected(true);
      setError(null);
      if (term) {
        term.clear();
        // Send a newline to trigger prompt display
        socket.emit('container:shell:input', { input: '\r' });
        // Focus the terminal
        setTimeout(() => {
          if (term) {
            term.focus();
          }
        }, 100);
      }
    });

    socket.on('container:shell:output', (data: { output: string }) => {
      if (term) {
        term.write(data.output);
      }
    });

    socket.on('container:shell:error', (data: { error: string }) => {
      console.error('Shell error:', data.error);
      setError(data.error);
      if (term) {
        term.writeln(`\r\n\x1b[31mError: ${data.error}\x1b[0m`);
      }
    });

    socket.on('container:shell:end', () => {
      console.log('Shell session ended');
      if (term) {
        term.writeln('\r\n\x1b[33mSession ended\x1b[0m');
      }
      setConnected(false);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
      if (term) {
        term.writeln('\r\n\x1b[31mDisconnected from server\x1b[0m');
      }
    });

    return () => {
      socket.off('connect');
      socket.off('container:shell:ready');
      socket.off('container:shell:output');
      socket.off('container:shell:error');
      socket.off('container:shell:end');
      socket.off('disconnect');
    };
  }, [socket, term]);

  // Third useEffect: Attach terminal to DOM and set up terminal handlers
  useEffect(() => {
    if (!term || !terminalRef.current || !socket) return;

    console.log('Attaching terminal to DOM');
    try {
      // Create fit addon
      const newFitAddon = new FitAddon();
      term.loadAddon(newFitAddon);
      setFitAddon(newFitAddon);

      // Create web links addon
      const webLinksAddon = new WebLinksAddon();
      term.loadAddon(webLinksAddon);

      // Open terminal in DOM
      term.open(terminalRef.current);

      // Write welcome message
      term.writeln('Connecting to container...');

      // Set up input handler
      const disposableInput = term.onData((data) => {
        if (socket && socket.connected) {
          socket.emit('container:shell:input', { input: data });
        } else {
          console.warn('Socket not connected, cannot send input');
          term.writeln('\r\n\x1b[31mNot connected to container. Please refresh the page.\x1b[0m');
        }
      });

      // Set up resize handler
      const disposableResize = term.onResize(({ cols, rows }) => {
        if (socket && socket.connected) {
          socket.emit('container:shell:resize', { containerId, cols, rows });
        }
      });

      // Start shell session
      console.log('Starting shell session for container:', containerId);
      socket.emit('container:shell:start', { containerId, shell: '/bin/sh' });

      // Fit terminal to container with a delay to ensure dimensions are available
      setTimeout(() => {
        try {
          if (newFitAddon && terminalRef.current &&
            terminalRef.current.offsetWidth > 0 && terminalRef.current.offsetHeight > 0) {
            console.log('Fitting terminal to container');
            newFitAddon.fit();
            // Focus after fitting
            term.focus();
          } else {
            console.log('Terminal container not ready for fitting yet');
          }
        } catch (error) {
          console.error('Error fitting terminal:', error);
        }
      }, 100);

      // Cleanup for this effect only
      return () => {
        console.log('Cleaning up terminal DOM attachment');
        disposableInput.dispose();
        disposableResize.dispose();
      };
    } catch (error: any) {
      console.error('Error attaching terminal to DOM:', error);
      setError(`Failed to attach terminal: ${error.message || 'Unknown error'}`);
    }
  }, [term, terminalRef.current, socket, containerId]);

  // Fourth useEffect: Handle window resize
  useEffect(() => {
    if (!fitAddon || !terminalRef.current) return;

    const handleResize = () => {
      try {
        if (terminalRef.current &&
          terminalRef.current.offsetWidth > 0 && terminalRef.current.offsetHeight > 0) {
          fitAddon.fit();
        }
      } catch (error) {
        console.error('Error during resize:', error);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [fitAddon, terminalRef.current]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow relative h-[500px]">
        <div
          ref={terminalRef}
          className="absolute inset-0 bg-black rounded-md overflow-hidden"
          onClick={() => {
            // Focus the terminal when clicking on the container
            if (term) {
              term.focus();
            }
          }}
        />
      </div>
      <div className="flex justify-between items-center mt-2">
        <div>
          {error && (
            <div className="text-red-500 text-sm">
              Error: {error}
            </div>
          )}
        </div>
        <div>
          <span className={`px-2 py-1 text-xs rounded-full ${connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
