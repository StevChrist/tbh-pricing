import subprocess
import os

def backup_database():
    backup_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "tbh_price_backup.sql"))
    print(f"Target backup path: {backup_path}")
    
    # We will invoke pg_dump via docker exec
    cmd = [
        "docker", "exec", "-t", "tbh-postgres",
        "pg_dump", "-U", "postgres", "-d", "tbh_price"
    ]
    
    try:
        # Open file to write stdout directly
        with open(backup_path, "w", encoding="utf-8") as f:
            result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True)
            
        if result.returncode == 0:
            size = os.path.getsize(backup_path)
            print(f"Backup succeeded! File size: {size} bytes.")
            return True
        else:
            print("Backup failed.")
            print(f"Error output: {result.stderr}")
            if os.path.exists(backup_path):
                os.remove(backup_path)
            return False
            
    except Exception as e:
        print(f"Exception during backup: {e}")
        if os.path.exists(backup_path):
            os.remove(backup_path)
        return False

if __name__ == "__main__":
    backup_database()
