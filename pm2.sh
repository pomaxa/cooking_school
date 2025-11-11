#!/bin/bash

# PM2 Management Script for Cooking School Booking System
# Usage: ./pm2.sh [command]

APP_NAME="cooking-school"
ECOSYSTEM="ecosystem.config.js"

case "$1" in
  start)
    echo "🚀 Starting $APP_NAME..."
    pm2 start $ECOSYSTEM
    ;;

  stop)
    echo "⏹️  Stopping $APP_NAME..."
    pm2 stop $APP_NAME
    ;;

  restart)
    echo "🔄 Restarting $APP_NAME..."
    pm2 restart $APP_NAME
    ;;

  reload)
    echo "🔄 Reloading $APP_NAME (zero-downtime)..."
    pm2 reload $APP_NAME
    ;;

  delete)
    echo "🗑️  Deleting $APP_NAME from PM2..."
    pm2 delete $APP_NAME
    ;;

  logs)
    echo "📋 Showing logs for $APP_NAME..."
    pm2 logs $APP_NAME
    ;;

  status)
    echo "📊 Status of all PM2 processes:"
    pm2 status
    ;;

  monit)
    echo "📊 Opening PM2 monitor..."
    pm2 monit
    ;;

  info)
    echo "ℹ️  Detailed info for $APP_NAME:"
    pm2 show $APP_NAME
    ;;

  save)
    echo "💾 Saving PM2 process list..."
    pm2 save
    ;;

  startup)
    echo "🔧 Setting up PM2 startup script..."
    pm2 startup
    echo ""
    echo "⚠️  Follow the instructions above, then run: ./pm2.sh save"
    ;;

  production)
    echo "🚀 Starting $APP_NAME in PRODUCTION mode..."
    pm2 start $ECOSYSTEM --env production
    ;;

  flush)
    echo "🧹 Flushing all logs..."
    pm2 flush
    ;;

  reset)
    echo "🔄 Resetting restart counter..."
    pm2 reset $APP_NAME
    ;;

  *)
    echo "🍳 Cooking School - PM2 Management Script"
    echo ""
    echo "Usage: ./pm2.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start       - Start the application"
    echo "  stop        - Stop the application"
    echo "  restart     - Restart the application"
    echo "  reload      - Reload (zero-downtime restart)"
    echo "  delete      - Remove from PM2"
    echo "  logs        - View logs in real-time"
    echo "  status      - Show status of all processes"
    echo "  monit       - Open PM2 monitor dashboard"
    echo "  info        - Show detailed process info"
    echo "  save        - Save current PM2 process list"
    echo "  startup     - Setup PM2 to start on boot"
    echo "  production  - Start in production mode"
    echo "  flush       - Clear all logs"
    echo "  reset       - Reset restart counter"
    echo ""
    echo "Examples:"
    echo "  ./pm2.sh start"
    echo "  ./pm2.sh logs"
    echo "  ./pm2.sh production"
    ;;
esac
