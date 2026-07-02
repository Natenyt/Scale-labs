# Generated for the workflow per-language voice feature (uz/ru via Yandex bridge).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('studio', '0004_campaign'),
    ]

    operations = [
        migrations.AddField(
            model_name='workflow',
            name='language',
            field=models.CharField(default='en', max_length=8),
        ),
        migrations.AddField(
            model_name='workflow',
            name='voice_id',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
        migrations.AddField(
            model_name='workflow',
            name='voice_role',
            field=models.CharField(blank=True, default='', max_length=32),
        ),
    ]
